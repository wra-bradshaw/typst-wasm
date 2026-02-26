import { Deferred, Effect, Queue, Ref } from "effect";
import type { TypstWorkerProtocol } from "./protocol";
import { PackageManager } from "./package-manager";
import TypstWorker from "./worker.ts?worker";
import { makeRpcClient, type RpcClient } from "./rpc";
import { isRpcResponseMessage, type WorkerToMainMessage } from "./messages";
import { makeFetchBridge } from "./fetch-bridge";
import type { WasmModuleOrPath } from "./wasm-module";
import { makeWorkerTransport } from "./worker-transport";

export class WorkerService extends Effect.Service<WorkerService>()("WorkerService", {
  scoped: Effect.gen(function* () {
    const packageManager = yield* PackageManager;

    const disposed = yield* Ref.make(false);
    const initialized = yield* Ref.make(false);
    const terminated = yield* Ref.make(false);
    const readyDeferred = yield* Deferred.make<void>();

    const terminateInstance = (w: Worker): Effect.Effect<void> =>
      Effect.gen(function* () {
        const isTerminated = yield* Ref.get(terminated);
        if (isTerminated) {
          return;
        }
        yield* Effect.sync(() => w.terminate());
        yield* Ref.set(terminated, true);
      });

    const worker = yield* Effect.acquireRelease(
      Effect.sync(() => new TypstWorker()),
      (w) => terminateInstance(w as Worker),
    );

    const transport = yield* makeWorkerTransport(worker);
    const fetchBridge = makeFetchBridge(packageManager, disposed);

    const terminateWorker = Effect.gen(function* () {
      yield* terminateInstance(worker as Worker);
    });

    const rpcClient: RpcClient<TypstWorkerProtocol> = yield* makeRpcClient((msg) => {
      transport.post(msg);
    });

    const handleMessage = (msg: WorkerToMainMessage) =>
      Effect.gen(function* () {
        if (isRpcResponseMessage(msg)) {
          yield* rpcClient.receive(msg);
          return;
        }

        switch (msg.kind) {
          case "ready":
            yield* Deferred.succeed(readyDeferred, undefined);
            break;
          case "web_fetch":
            yield* fetchBridge.handleFetchRequest(msg.payload.path);
            break;
        }
      });

    yield* Effect.gen(function* () {
      while (true) {
        const msg = yield* Queue.take(transport.incoming);
        yield* handleMessage(msg);
      }
    }).pipe(Effect.forkScoped);

    yield* Effect.addFinalizer(() =>
      Effect.gen(function* () {
        yield* Ref.set(disposed, true);
        yield* terminateWorker;
      }),
    );

    return {
      ready: Deferred.await(readyDeferred),

      init: (moduleOrPath: WasmModuleOrPath) =>
        Effect.gen(function* () {
          const isDisposed = yield* Ref.get(disposed);
          if (isDisposed) {
            return;
          }

          const alreadyInitialized = yield* Ref.get(initialized);
          if (alreadyInitialized) {
            return;
          }

          yield* Ref.set(initialized, true);
          yield* rpcClient.notify({
            kind: "init",
            requestId: 0,
            payload: {
              sharedMemoryCommunication: fetchBridge.sharedMemoryCommunication,
              moduleOrPath,
            },
          });
        }),

      dispose: Effect.gen(function* () {
        yield* Ref.set(disposed, true);
        yield* terminateWorker;
      }),

      addFont: (data: Uint8Array) => rpcClient.call("add_font", { data }),
      addFile: (path: string, data: Uint8Array) => rpcClient.call("add_file", { path, data }),
      addSource: (path: string, text: string) => rpcClient.call("add_source", { path, text }),
      removeFile: (path: string) => rpcClient.call("remove_file", { path }),
      clearFiles: rpcClient.call("clear_files"),
      listFiles: rpcClient.call("list_files"),
      hasFile: (path: string) => rpcClient.call("has_file", { path }),
      setMain: (path: string) => rpcClient.call("set_main", { path }),
      compile: () => rpcClient.call("compile"),
    };
  }),
  dependencies: [PackageManager.Default],
}) {}
