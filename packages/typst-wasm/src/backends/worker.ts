import type { FileLoaderManager } from "../files/loaders";
import { CompilerDisposedError } from "../errors";
import { makeFetchBridge } from "../worker/fetch-bridge";
import {
  isRpcResponseMessage,
  type WorkerToMainMessage,
} from "../worker/messages";
import type { WorkerHost } from "../worker/host";
import type { TypstWorkerProtocol } from "../worker/protocol";
import { makeRpcClient, type RpcClient } from "../worker/rpc";
import { makeWorkerTransport, type WorkerTransport } from "../worker/transport";
import type {
  WasmBytes,
  WasmCompileOptions,
  WasmCompileOutput,
  WasmModuleSource,
} from "../wasm/index";

export type TypstWorkerFactory = () => WorkerHost;

export interface WorkerServiceInternals {
  createWorker?: TypstWorkerFactory;
}

export class WorkerService {
  private disposed = false;
  private initPromise: Promise<void> | null = null;
  private readonly worker: WorkerHost;
  private readonly rpcClient: RpcClient<TypstWorkerProtocol>;
  private readonly transport: WorkerTransport;

  constructor(
    fileLoaderManager: FileLoaderManager,
    internals: WorkerServiceInternals = {},
  ) {
    if (!internals.createWorker) {
      throw new Error("WorkerService requires a worker factory");
    }

    this.worker = internals.createWorker();
    const fetchBridge = makeFetchBridge(fileLoaderManager, () => this.disposed);

    this.rpcClient = makeRpcClient<TypstWorkerProtocol>((msg) => {
      this.transport.post(msg);
    });

    this.transport = makeWorkerTransport(
      this.worker,
      (msg) => {
        void this.handleMessage(msg, fetchBridge.handleFetchRequest);
      },
      (cause) => {
        this.rpcClient.rejectAll(cause);
      },
    );

    this.initWorker = async (wasmBytes: WasmBytes) => {
      await this.rpcClient.call("init", {
        sharedMemoryCommunication: fetchBridge.sharedMemoryCommunication,
        wasmBytes,
      });
    };
  }

  private readonly initWorker: (wasmBytes: WasmBytes) => Promise<void>;

  async init(wasmSource?: WasmBytes | WasmModuleSource): Promise<void> {
    this.assertNotDisposed();
    if (!wasmSource || wasmSource instanceof WebAssembly.Module) {
      throw new Error("Worker backend requires assets.wasm bytes");
    }
    this.initPromise ??= this.initWorker(wasmSource);
    try {
      await this.initPromise;
    } catch (error) {
      this.initPromise = null;
      throw error;
    }
  }

  async dispose(): Promise<void> {
    if (this.disposed) return;
    this.disposed = true;
    this.rpcClient.rejectAll(
      new CompilerDisposedError("Compiler has been disposed"),
    );
    this.transport.close();
    void this.worker.terminate();
  }

  addFont(data: Uint8Array): Promise<void> {
    this.assertNotDisposed();
    return this.rpcClient.call("add_font", { data });
  }

  addFile(path: string, data: Uint8Array): Promise<void> {
    this.assertNotDisposed();
    return this.rpcClient.call("add_file", { path, data });
  }

  addSource(path: string, text: string): Promise<void> {
    this.assertNotDisposed();
    return this.rpcClient.call("add_source", { path, text });
  }

  removeFile(path: string): Promise<void> {
    this.assertNotDisposed();
    return this.rpcClient.call("remove_file", { path });
  }

  clearFiles(): Promise<void> {
    this.assertNotDisposed();
    return this.rpcClient.call("clear_files");
  }

  listFiles(): Promise<string[]> {
    this.assertNotDisposed();
    return this.rpcClient.call("list_files");
  }

  hasFile(path: string): Promise<boolean> {
    this.assertNotDisposed();
    return this.rpcClient.call("has_file", { path });
  }

  setMain(path: string): Promise<void> {
    this.assertNotDisposed();
    return this.rpcClient.call("set_main", { path });
  }

  compile(options: WasmCompileOptions): Promise<WasmCompileOutput> {
    this.assertNotDisposed();
    return this.rpcClient.call("compile", { options });
  }

  private async handleMessage(
    msg: WorkerToMainMessage,
    handleFetchRequest: (path: string) => Promise<void>,
  ): Promise<void> {
    if (isRpcResponseMessage(msg)) {
      this.rpcClient.receive(msg);
      return;
    }

    switch (msg.kind) {
      case "web_fetch":
        await handleFetchRequest(msg.payload.path);
        return;
    }
  }

  private assertNotDisposed(): void {
    if (this.disposed) {
      throw new CompilerDisposedError("Compiler has been disposed");
    }
  }
}
