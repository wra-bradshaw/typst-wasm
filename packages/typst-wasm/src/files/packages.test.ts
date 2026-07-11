import { createTarGzip } from "nanotar";
import { describe, expect, it } from "vitest";
import { PackageFetchError, FileNotFoundError } from "../errors";
import { makeMemoryCacheStorage, type PackageCache } from "./cache";
import { PackageManager } from "./packages";

const url = "https://packages.test/preview/demo-1.0.0.tar.gz";
const spec = "@preview/demo:1.0.0/lib.typ";

const archive = async (contents = "#let answer = 42") =>
  await createTarGzip([{ name: "lib.typ", data: contents }]);

const response = (data: Uint8Array, status = 200): Response =>
  new Response(data, {
    status,
    headers: { "content-type": "application/gzip" },
  });

const options = (
  fetch: typeof globalThis.fetch,
  cache?: PackageCache | false,
) => ({
  fetch,
  packageBaseUrl: "https://packages.test",
  cache,
});

describe("PackageManager", () => {
  it("retries transient HTTP failures and eventually succeeds", async () => {
    const valid = await archive();
    let requests = 0;
    const manager = new PackageManager(
      options(async () => {
        requests++;
        return requests < 3 ? response(new Uint8Array(), 503) : response(valid);
      }, false),
    );

    await expect(manager.getFile(spec)).resolves.toEqual(
      new TextEncoder().encode("#let answer = 42"),
    );
    expect(requests).toBe(3);
  }, 5000);

  it("serves a cache hit without making a request", async () => {
    const cache = makeMemoryCacheStorage();
    const valid = await archive("cached");
    await cache.put(url, response(valid));
    let requests = 0;
    const manager = new PackageManager(
      options(async () => {
        requests++;
        return response(valid);
      }, cache),
    );

    await expect(manager.getFile(spec)).resolves.toEqual(
      new TextEncoder().encode("cached"),
    );
    expect(requests).toBe(0);
  });

  it("replaces a corrupted cached archive", async () => {
    const cache = makeMemoryCacheStorage();
    const valid = await archive("replacement");
    await cache.put(url, response(new TextEncoder().encode("not tar")));
    let requests = 0;
    const manager = new PackageManager(
      options(async () => {
        requests++;
        return response(valid);
      }, cache),
    );

    await expect(manager.getFile(spec)).resolves.toEqual(
      new TextEncoder().encode("replacement"),
    );
    expect(requests).toBe(1);
    await expect((await cache.match(url))?.text()).resolves.not.toBe("not tar");
  });

  it("reports invalid downloaded archives and missing members", async () => {
    const invalid = new PackageManager(
      options(async () => response(new TextEncoder().encode("invalid")), false),
    );
    await expect(invalid.getFile(spec)).rejects.toBeInstanceOf(
      PackageFetchError,
    );

    const valid = await archive();
    const missing = new PackageManager(
      options(async () => response(valid), false),
    );
    await expect(
      missing.getFile("@preview/demo:1.0.0/missing.typ"),
    ).rejects.toBeInstanceOf(FileNotFoundError);
  });
});
