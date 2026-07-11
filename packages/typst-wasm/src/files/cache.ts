import type { ResolvedLogger } from "../logging";

export interface PackageCache {
  match(request: RequestInfo | URL): Promise<Response | null>;
  put(request: RequestInfo | URL, response: Response): Promise<void>;
}

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
        return await cache.match(request);
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

export const makeMemoryCacheStorage = (capacity = 400): PackageCache => {
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

export const makeDefaultPackageCache = (
  logger?: ResolvedLogger,
): PackageCache | undefined =>
  typeof caches === "undefined" ? undefined : makeBrowserCacheStorage(logger);
