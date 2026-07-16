import type { FileLoaderManager } from "../files/loaders";
import type { FontInput } from "../compiler/types";
import { CompilerDisposedError } from "../errors";
import type { ResolvedLogger } from "../logging";
import { makeFetchBridge } from "../worker/fetch-bridge";
import type { WorkerEventMessage } from "../worker/messages";
import type { WorkerHost } from "../worker/host";
import type { TypstWorkerProtocol } from "../worker/protocol";
import { makeRpcClient, type RpcClient } from "../worker/rpc";
import { makeWorkerTransport, type WorkerTransport } from "../worker/transport";
import { resolveCoreModules } from "../engine/core-modules";
import type {
  EngineCompileOptions,
  EngineCompileSuccess,
  CoreModules,
  EngineFetchRequest,
} from "../engine/types";

export type TypstWorkerFactory = () => WorkerHost;

export interface WorkerServiceInternals {
  createWorker?: TypstWorkerFactory;
  coreModules: CoreModules;
  logger?: ResolvedLogger;
}

export class WorkerService {
  private disposed = false;
  private initPromise: Promise<void> | null = null;
  private readonly worker: WorkerHost;
  private readonly rpcClient: RpcClient<TypstWorkerProtocol>;
  private readonly transport: WorkerTransport;

  constructor(
    fileLoaderManager: FileLoaderManager,
    internals: WorkerServiceInternals,
  ) {
    if (!internals.createWorker) {
      throw new Error("WorkerService requires a worker factory");
    }

    this.worker = internals.createWorker();
    const logger = internals.logger;
    const fetchBridge = makeFetchBridge(
      fileLoaderManager,
      () => this.disposed,
      logger,
    );

    this.rpcClient = makeRpcClient<TypstWorkerProtocol>((msg) => {
      this.transport.post(msg);
    });

    this.transport = makeWorkerTransport(
      this.worker,
      (msg) => {
        this.rpcClient.receive(msg);
      },
      (msg) => {
        void this.handleEvent(msg, fetchBridge.handleFetchRequest).catch(
          (cause) => {
            logger?.error("Typst worker event handling failed", cause);
          },
        );
      },
      (cause) => {
        logger?.error("Typst worker failed", cause);
        this.rpcClient.rejectAll(cause);
      },
      logger,
    );

    this.initWorker = async () => {
      const coreModules = await resolveCoreModules(internals.coreModules);

      this.assertNotDisposed();
      await this.rpcClient.call("init", {
        sharedMemoryCommunication: fetchBridge.sharedMemoryCommunication,
        coreModules,
      });
    };
  }

  private readonly initWorker: () => Promise<void>;

  async init(): Promise<void> {
    this.assertNotDisposed();
    this.initPromise ??= this.initWorker();
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

  async addFonts(...fonts: FontInput[]): Promise<void> {
    this.assertNotDisposed();
    const data = await Promise.all(fonts);
    this.assertNotDisposed();
    return this.rpcClient.call("add_fonts", { data });
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

  compile(options: EngineCompileOptions): Promise<EngineCompileSuccess> {
    this.assertNotDisposed();
    return this.rpcClient.call("compile", { options });
  }

  private async handleEvent(
    msg: WorkerEventMessage,
    handleFetchRequest: (request: EngineFetchRequest) => Promise<void>,
  ): Promise<void> {
    switch (msg.kind) {
      case "web_fetch":
        await handleFetchRequest(msg.payload.request);
        return;
    }
  }

  private assertNotDisposed(): void {
    if (this.disposed) {
      throw new CompilerDisposedError("Compiler has been disposed");
    }
  }
}
