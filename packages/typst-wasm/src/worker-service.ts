import type { TypstWorkerProtocol } from "./protocol";
import type { PackageManager } from "./package-manager";
import TypstWorker from "./worker.ts?worker";
import { makeRpcClient, type RpcClient } from "./rpc";
import { isRpcResponseMessage, type WorkerToMainMessage } from "./messages";
import { makeFetchBridge } from "./fetch-bridge";
import type { WasmModuleOrPath } from "./wasm-module";
import { makeWorkerTransport, type WorkerTransport } from "./worker-transport";
import type { WasmCompileOptions, WasmCompileOutput } from "./wasm";
import { CompilerDisposedError } from "./errors";

export class WorkerService {
  private disposed = false;
  private initPromise: Promise<void> | null = null;
  private readonly worker: Worker;
  private readonly rpcClient: RpcClient<TypstWorkerProtocol>;
  private readonly transport: WorkerTransport;

  constructor(packageManager: PackageManager, fetchImpl: typeof fetch = fetch) {
    this.worker = new TypstWorker() as Worker;
    const fetchBridge = makeFetchBridge(
      packageManager,
      () => this.disposed,
      fetchImpl,
    );

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

    this.initWorker = async (moduleOrPath: WasmModuleOrPath) => {
      await this.rpcClient.call("init", {
        sharedMemoryCommunication: fetchBridge.sharedMemoryCommunication,
        moduleOrPath,
      });
    };
  }

  private readonly initWorker: (
    moduleOrPath: WasmModuleOrPath,
  ) => Promise<void>;

  async init(moduleOrPath: WasmModuleOrPath): Promise<void> {
    this.assertNotDisposed();
    this.initPromise ??= this.initWorker(moduleOrPath);
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
    this.worker.terminate();
  }

  addFont(data: Uint8Array): Promise<void> {
    return this.rpcClient.call("add_font", { data });
  }

  addFile(path: string, data: Uint8Array): Promise<void> {
    return this.rpcClient.call("add_file", { path, data });
  }

  addSource(path: string, text: string): Promise<void> {
    return this.rpcClient.call("add_source", { path, text });
  }

  removeFile(path: string): Promise<void> {
    return this.rpcClient.call("remove_file", { path });
  }

  clearFiles(): Promise<void> {
    return this.rpcClient.call("clear_files");
  }

  listFiles(): Promise<string[]> {
    return this.rpcClient.call("list_files");
  }

  hasFile(path: string): Promise<boolean> {
    return this.rpcClient.call("has_file", { path });
  }

  setMain(path: string): Promise<void> {
    return this.rpcClient.call("set_main", { path });
  }

  compile(options: WasmCompileOptions): Promise<WasmCompileOutput> {
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
