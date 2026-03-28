import { Effect, Ref } from "effect";
import { FetchError } from "./errors";
import { SharedMemoryCommunication, SharedMemoryCommunicationStatus } from "./protocol";

type PackageFileLoader = {
  readonly getFile: (spec: string) => Effect.Effect<Uint8Array, unknown>;
};

export type FetchBridge = {
  readonly sharedMemoryCommunication: SharedMemoryCommunication;
  readonly handleFetchRequest: (path: string) => Effect.Effect<void>;
};

export const makeFetchBridge = (packageLoader: PackageFileLoader, disposed: Ref.Ref<boolean>): FetchBridge => {
  const sharedMemoryCommunication = new SharedMemoryCommunication();

  const handleFetchRequest = (path: string) =>
    Effect.gen(function* () {
      const isDisposed = yield* Ref.get(disposed);
      if (isDisposed) return;

      const result = yield* Effect.gen(function* () {
        if (path.startsWith("@")) {
          return yield* packageLoader.getFile(path);
        }

        const response = yield* Effect.tryPromise({
          try: async () => {
            const r = await fetch(path);
            if (!r.ok) throw new Error(`Status ${r.status}`);
            return r;
          },
          catch: (cause) => new FetchError({ path, cause }),
        });

        return new Uint8Array(yield* Effect.promise(() => response.arrayBuffer()));
      }).pipe(Effect.either);

      const isDisposedAfterFetch = yield* Ref.get(disposed);
      if (isDisposedAfterFetch) return;

      if (result._tag === "Right") {
        sharedMemoryCommunication.setBuffer(result.right);
        sharedMemoryCommunication.setStatus(SharedMemoryCommunicationStatus.Success);
      } else {
        sharedMemoryCommunication.setStatus(SharedMemoryCommunicationStatus.Error);
      }
    });

  return {
    sharedMemoryCommunication,
    handleFetchRequest,
  };
};
