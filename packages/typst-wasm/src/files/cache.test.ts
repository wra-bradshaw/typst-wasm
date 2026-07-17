import { describe, expect, it, vi } from "vitest";
import { makeBrowserCacheStorage, makeMemoryCacheStorage } from "./cache";

const response = (value: string) => new Response(value);

describe("memory package cache", () => {
  it("validates capacity", () => {
    expect(() => makeMemoryCacheStorage(-1)).toThrow(RangeError);
    expect(() => makeMemoryCacheStorage(1.5)).toThrow(RangeError);
    expect(() => makeMemoryCacheStorage(Infinity)).toThrow(RangeError);
  });

  it("clones responses and updates LRU recency", async () => {
    const cache = makeMemoryCacheStorage(2);
    await cache.put("a", response("A"));
    const original = await cache.match("a");
    expect(await original?.text()).toBe("A");
    await cache.put("b", response("B"));
    await cache.match("a");
    await cache.put("c", response("C"));
    expect(await cache.match("a")).not.toBeNull();
    expect(await cache.match("b")).toBeNull();
    expect(await cache.match("c")).not.toBeNull();
  });

  it("supports zero and one entry capacities", async () => {
    const empty = makeMemoryCacheStorage(0);
    await empty.put("a", response("A"));
    expect(await empty.match("a")).toBeNull();
    const one = makeMemoryCacheStorage(1);
    await one.put("a", response("A"));
    await one.put("b", response("B"));
    expect(await one.match("a")).toBeNull();
    expect(await one.match("b")).not.toBeNull();
  });
});

describe("browser package cache", () => {
  it("reuses one cache-open promise and tolerates storage failures", async () => {
    const match = vi.fn().mockResolvedValue(new Response("cached"));
    const put = vi.fn().mockRejectedValue(new Error("write failed"));
    const open = vi.fn().mockResolvedValue({ match, put });
    vi.stubGlobal("caches", { open });
    const cache = makeBrowserCacheStorage();
    expect(await (await cache.match("x"))?.text()).toBe("cached");
    await cache.put("x", response("new"));
    await cache.match("y");
    expect(open).toHaveBeenCalledTimes(1);
    expect(match).toHaveBeenCalledTimes(2);
    vi.unstubAllGlobals();
  });

  it("falls back when cache storage cannot be opened or read", async () => {
    vi.stubGlobal("caches", {
      open: vi.fn().mockRejectedValue(new Error("no cache")),
    });
    const cache = makeBrowserCacheStorage();
    expect(await cache.match("x")).toBeNull();
    await expect(cache.put("x", response("x"))).resolves.toBeUndefined();
    vi.unstubAllGlobals();
  });
});
