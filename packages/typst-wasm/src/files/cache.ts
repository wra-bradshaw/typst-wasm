import type { ResolvedLogger } from "../logging";

/** Asynchronous cache for compressed Typst package archives (`.tar.gz`). */
export interface PackageCache {
  match(request: RequestInfo | URL): Promise<Response | null>;
  put(request: RequestInfo | URL, response: Response): Promise<void>;
}

/** Creates a package cache backed by the browser Cache Storage API. */
export const makeBrowserCacheStorage = (
  logger?: ResolvedLogger,
): PackageCache => {
  let cachePromise: Promise<Cache | null> | null = null;

  const openCache = async (): Promise<Cache | null> => {
    cachePromise ??= (async () => {
      try {
        return await caches.open("typst-packages-v1");
      } catch (error) {
        logger?.error("Failed to open Typst package cache", error);
        return null;
      }
    })();
    return cachePromise;
  };

  return {
    async match(request) {
      const cache = await openCache();
      if (!cache) return null;
      try {
        return (await cache.match(request)) ?? null;
      } catch (error) {
        logger?.error("Failed to read Typst package cache", error);
        return null;
      }
    },

    async put(request, response) {
      const cache = await openCache();
      if (!cache) return;
      try {
        await cache.put(request, response);
      } catch (error) {
        logger?.error("Failed to write Typst package cache", error);
      }
    },
  };
};

/** Creates an entry-count-bounded in-memory LRU for compressed package archives. */
export const makeMemoryCacheStorage = (capacity = 400): PackageCache => {
  if (
    !Number.isFinite(capacity) ||
    !Number.isInteger(capacity) ||
    capacity < 0
  ) {
    throw new RangeError(
      "package archive cache capacity must be a finite, non-negative integer",
    );
  }
  const storage = new Map<string, Response>();
  const key = (request: RequestInfo | URL): string => String(request);

  return {
    async match(request) {
      const value = storage.get(key(request));
      if (!value) return null;
      storage.delete(key(request));
      storage.set(key(request), value);
      return value.clone();
    },

    async put(request, response) {
      const cacheKey = key(request);
      storage.delete(cacheKey);
      storage.set(cacheKey, response.clone());
      while (storage.size > capacity) {
        const oldest = storage.keys().next().value;
        if (oldest === undefined) break;
        storage.delete(oldest);
      }
    },
  };
};

/** Creates the browser cache when Cache Storage is available. */
export const makeDefaultPackageCache = (
  logger?: ResolvedLogger,
): PackageCache | undefined =>
  typeof caches === "undefined" ? undefined : makeBrowserCacheStorage(logger);
