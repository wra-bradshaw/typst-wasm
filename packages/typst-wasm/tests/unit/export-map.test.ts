import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

type PackageJson = {
  exports: Record<string, unknown>;
};

const readPackageJson = async (): Promise<PackageJson> =>
  JSON.parse(
    await readFile(join(import.meta.dirname, "../../package.json"), "utf8"),
  ) as PackageJson;

const readFontsPackageJson = async (): Promise<PackageJson> =>
  JSON.parse(
    await readFile(
      resolve(import.meta.dirname, "../../../fonts/package.json"),
      "utf8",
    ),
  ) as PackageJson;

describe("package exports", () => {
  it("keeps the public surface to the main API, file helpers, and wasm details", async () => {
    const packageJson = await readPackageJson();

    expect(Object.keys(packageJson.exports).sort()).toEqual([
      ".",
      "./files",
      "./wasm",
    ]);
  });

  it("routes bundlers and workerd runtimes before the default Node entry", async () => {
    const packageJson = await readPackageJson();

    expect(packageJson.exports["."]).toEqual({
      types: "./dist/index.d.ts",
      browser: {
        types: "./dist/index.browser.d.ts",
        default: "./dist/index.browser.js",
      },
      workerd: {
        types: "./dist/index.workerd.d.ts",
        default: "./dist/index.workerd.js",
      },
      worker: {
        types: "./dist/index.workerd.d.ts",
        default: "./dist/index.workerd.js",
      },
      default: "./dist/index.js",
    });
    expect(
      Object.keys(packageJson.exports["."] as Record<string, unknown>),
    ).toEqual(["types", "browser", "workerd", "worker", "default"]);
    expect(packageJson.exports["./wasm"]).toEqual({
      types: "./dist/wasm.d.ts",
      default: "./dist/wasm.js",
    });
    expect(packageJson.exports["./files"]).toEqual({
      types: "./dist/files.d.ts",
      default: "./dist/files.js",
    });
  });

  it("routes fonts browser consumers to the fetch-only font entry", async () => {
    const packageJson = await readFontsPackageJson();

    expect(packageJson.exports["."]).toEqual({
      types: "./index.d.ts",
      browser: {
        types: "./index.d.ts",
        default: "./index.browser.js",
      },
      workerd: {
        types: "./index.d.ts",
        default: "./index.browser.js",
      },
      worker: {
        types: "./index.d.ts",
        default: "./index.browser.js",
      },
      default: "./index.js",
    });
    expect(
      Object.keys(packageJson.exports["."] as Record<string, unknown>),
    ).toEqual(["types", "browser", "workerd", "worker", "default"]);
  });
});
