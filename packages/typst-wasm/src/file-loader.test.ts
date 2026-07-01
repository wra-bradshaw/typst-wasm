import { describe, expect, it, vi } from "vitest";
import {
  classifyTypstFilePath,
  FetchFileLoader,
  FileLoaderManager,
} from "./file-loader";
import { PackageFileLoader, PackageManager } from "./package-manager";
import type { TypstFileLoader } from "./types";

describe("file loader manager", () => {
  it("classifies Typst paths", () => {
    expect(classifyTypstFilePath("@preview/cetz:0.3.4/lib.typ")).toBe(
      "package",
    );
    expect(classifyTypstFilePath("https://example.com/data.typ")).toBe("url");
    expect(classifyTypstFilePath("chapter.typ")).toBe("project");
  });

  it("tries loaders in order until one handles the request", async () => {
    const first = {
      load: vi.fn(async () => null),
    } satisfies TypstFileLoader;
    const second = {
      load: vi.fn(async () => ({
        data: new Uint8Array([1, 2, 3]),
        resolvedPath: "/resolved/main.typ",
      })),
    } satisfies TypstFileLoader;
    const third = {
      load: vi.fn(async () => new Uint8Array([9])),
    } satisfies TypstFileLoader;
    const manager = new FileLoaderManager([first, second, third]);

    await expect(manager.load("main.typ")).resolves.toEqual(
      new Uint8Array([1, 2, 3]),
    );

    expect(first.load).toHaveBeenCalledTimes(1);
    expect(second.load).toHaveBeenCalledTimes(1);
    expect(third.load).not.toHaveBeenCalled();
    expect(manager.getTrace()).toEqual([
      {
        path: "main.typ",
        kind: "project",
        resolvedPath: "/resolved/main.typ",
        mediaType: undefined,
      },
    ]);
  });

  it("lets project loaders pass package imports to the package loader", async () => {
    const projectLoader = {
      load: vi.fn(async (request) =>
        request.kind === "project" ? new Uint8Array([1]) : null,
      ),
    } satisfies TypstFileLoader;
    const packageManager = new PackageManager();
    const getFile = vi
      .spyOn(packageManager, "getFile")
      .mockResolvedValue(new Uint8Array([4, 5]));
    const manager = new FileLoaderManager([
      projectLoader,
      new PackageFileLoader(packageManager),
    ]);

    await expect(manager.load("@preview/cetz:0.3.4/lib.typ")).resolves.toEqual(
      new Uint8Array([4, 5]),
    );

    expect(projectLoader.load).toHaveBeenCalledWith({
      path: "@preview/cetz:0.3.4/lib.typ",
      kind: "package",
    });
    expect(getFile).toHaveBeenCalledWith("@preview/cetz:0.3.4/lib.typ");
  });

  it("uses fetch fallback for non-package paths", async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(new Uint8Array([7]), {
          headers: { "content-type": "application/octet-stream" },
        }),
    );
    const manager = new FileLoaderManager([new FetchFileLoader(fetchImpl)]);

    await expect(manager.load("/asset.bin")).resolves.toEqual(
      new Uint8Array([7]),
    );

    expect(fetchImpl).toHaveBeenCalledWith("/asset.bin");
    expect(manager.getTrace()).toEqual([
      {
        path: "/asset.bin",
        kind: "project",
        resolvedPath: undefined,
        mediaType: "application/octet-stream",
      },
    ]);
  });

  it("deduplicates repeated dependency trace entries", async () => {
    const manager = new FileLoaderManager([
      {
        load: async () => ({
          data: new Uint8Array([1]),
          resolvedPath: "/same.typ",
        }),
      },
    ]);

    await manager.load("same.typ");
    await manager.load("same.typ");

    expect(manager.getTrace()).toHaveLength(1);
  });
});
