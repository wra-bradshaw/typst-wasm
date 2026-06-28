import type { PackageCache } from "./types";

export const makeBrowserCacheStorage = (): PackageCache => {
  let cachePromise: Promise<Cache | null> | null = null;

  const openCache = async (): Promise<Cache | null> => {
    cachePromise ??= caches.open("typst-packages").catch(() => null);
    return cachePromise;
  };

  return {
    async get(key: string): Promise<Uint8Array | null> {
      const cache = await openCache();
      if (!cache) return null;

      try {
        const response = await cache.match(key);
        if (!response) return null;
        return new Uint8Array(await response.arrayBuffer());
      } catch {
        return null;
      }
    },

    async set(key: string, value: Uint8Array): Promise<void> {
      const cache = await openCache();
      if (!cache) return;

      try {
        const response = new Response(value.slice(), {
          headers: { "Content-Type": "application/octet-stream" },
        });
        await cache.put(key, response);
      } catch {
        // Cache failures should not make compilation fail.
      }
    },
  };
};

export const makeMemoryCacheStorage = (capacity: number): PackageCache => {
  const storage = new Map<string, Uint8Array>();

  return {
    async get(key: string): Promise<Uint8Array | null> {
      const value = storage.get(key);
      if (!value) return null;
      storage.delete(key);
      storage.set(key, value);
      return value;
    },

    async set(key: string, value: Uint8Array): Promise<void> {
      if (storage.has(key)) {
        storage.delete(key);
      }

      storage.set(key, value);
      while (storage.size > capacity) {
        const oldest = storage.keys().next().value as string | undefined;
        if (!oldest) break;
        storage.delete(oldest);
      }
    },
  };
};

export const makeDefaultPackageCache = (capacity = 400): PackageCache =>
  typeof caches !== "undefined"
    ? makeBrowserCacheStorage()
    : makeMemoryCacheStorage(capacity);
