import { Effect } from "effect";

export interface CacheStorage {
  readonly get: (key: string) => Effect.Effect<Uint8Array | null>;
  readonly set: (key: string, value: Uint8Array) => Effect.Effect<void>;
}

const makeBrowserCacheStorage = Effect.sync((): CacheStorage => {
  let cache: Cache | null = null;

  const initCache = Effect.promise(async () => {
    if (cache) return;
    try {
      cache = await caches.open("typst-packages");
    } catch {
      cache = null;
    }
  });

  return {
    get: (key: string): Effect.Effect<Uint8Array | null> =>
      Effect.gen(function* () {
        yield* initCache;
        if (!cache) return null;

        const result = yield* Effect.promise(async () => {
          try {
            const response = await cache!.match(key);
            if (!response) return null;
            return new Uint8Array(await response.arrayBuffer()) as Uint8Array | null;
          } catch {
            return null as Uint8Array | null;
          }
        });
        return result;
      }),

    set: (key: string, value: Uint8Array): Effect.Effect<void> =>
      Effect.gen(function* () {
        yield* initCache;
        if (!cache) return;

        yield* Effect.promise(async () => {
          try {
            const response = new Response(value.buffer as ArrayBuffer, {
              headers: { "Content-Type": "application/octet-stream" },
            });
            await cache!.put(key, response);
          } catch {
            // Silently ignore cache write failures
          }
        });
      }),
  } satisfies CacheStorage;
});

const makeMemoryCacheStorage = (capacity: number): CacheStorage => {
  const storage = new Map<string, Uint8Array>();
  const keys: string[] = [];

  return {
    get: (key: string) => Effect.sync(() => storage.get(key) ?? null),

    set: (key: string, value: Uint8Array) =>
      Effect.sync(() => {
        if (storage.has(key)) {
          storage.set(key, value);
        } else {
          storage.set(key, value);
          keys.push(key);
          while (keys.length > capacity) {
            const oldest = keys.shift()!;
            storage.delete(oldest);
          }
        }
      }),
  } satisfies CacheStorage;
};

export class CacheStorageService extends Effect.Service<CacheStorageService>()("CacheStorageService", {
  accessors: true,
  effect: typeof caches !== "undefined" ? makeBrowserCacheStorage : Effect.sync(() => makeMemoryCacheStorage(400)),
}) {}
