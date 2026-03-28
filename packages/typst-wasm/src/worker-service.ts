import { Deferred, Effect, Queue, Ref } from "effect";
import type { TypstWorkerProtocol } from "./protocol";
import { PackageManager } from "./package-manager";
import TypstWorker from "./worker.ts?worker";
import { makeRpcClient, type RpcClient, type RpcError } from "./rpc";
import { isRpcResponseMessage, type WorkerToMainMessage } from "./messages";
import { makeFetchBridge } from "./fetch-bridge";
import type { WasmModuleOrPath } from "./wasm-module";
import { makeWorkerTransport } from "./worker-transport";

type InitState =
  | { readonly _tag: "idle" }
  | { readonly _tag: "initializing"; readonly deferred: Deferred.Deferred<void, RpcError> }
  | { readonly _tag: "ready" };

export class WorkerService extends Effect.Service<WorkerService>()("WorkerService", {
  scoped: Effect.gen(function* () {
    const packageManager = yield* PackageManager;

    const disposed = yield* Ref.make(false);
    const initState = yield* Ref.make<InitState>({ _tag: "idle" });
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

          const initDeferred = yield* Deferred.make<void, RpcError>();
          const action = yield* Ref.modify(initState, (state) => {
            switch (state._tag) {
              case "ready":
                return [{ _tag: "ready" } as const, state] as const;
              case "initializing":
                return [{ _tag: "await", deferred: state.deferred } as const, state] as const;
              case "idle":
                return [
                  { _tag: "start", deferred: initDeferred } as const,
                  { _tag: "initializing", deferred: initDeferred } as const,
                ] as const;
            }
          });

          switch (action._tag) {
            case "ready":
              return;
            case "await":
              return yield* Deferred.await(action.deferred);
            case "start": {
              const initResult = yield* rpcClient.call("init", {
                sharedMemoryCommunication: fetchBridge.sharedMemoryCommunication,
                moduleOrPath,
              }).pipe(Effect.either);

              if (initResult._tag === "Left") {
                yield* Ref.set(initState, { _tag: "idle" });
                yield* Deferred.fail(action.deferred, initResult.left);
                return yield* Effect.fail(initResult.left);
              }

              yield* Deferred.await(readyDeferred);
              yield* Ref.set(initState, { _tag: "ready" });
              yield* Deferred.succeed(action.deferred, undefined);
              return;
            }
          }
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
