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
  it("keeps explicit public runtime surfaces", async () => {
    const packageJson = await readPackageJson();

    expect(Object.keys(packageJson.exports).sort()).toEqual([
      ".",
      "./browser",
      "./files",
      "./node",
      "./worker/browser",
      "./worker/node",
      "./workerd",
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
    expect(packageJson.exports["./files"]).toEqual({
      types: "./dist/files.d.ts",
      default: "./dist/files.js",
    });
    expect(packageJson.exports["./browser"]).toEqual({
      types: "./dist/index.browser.d.ts",
      default: "./dist/index.browser.js",
    });
    expect(packageJson.exports["./node"]).toEqual({
      types: "./dist/index.d.ts",
      default: "./dist/index.js",
    });
    expect(packageJson.exports["./workerd"]).toEqual({
      types: "./dist/index.workerd.d.ts",
      default: "./dist/index.workerd.js",
    });
    expect(packageJson.exports["./worker/node"]).toEqual({
      types: "./dist/worker/node.d.ts",
      default: "./dist/worker/node.js",
    });
    expect(packageJson.exports["./worker/browser"]).toEqual({
      types: "./dist/worker/browser.d.ts",
      default: "./dist/worker/browser.js",
    });
  });

  it("exports fonts as files only", async () => {
    const packageJson = await readFontsPackageJson();

    expect(packageJson.exports).toEqual({
      "./NewCMMath-Bold.otf": "./dist/files/NewCMMath-Bold.otf",
      "./NewCMMath-Book.otf": "./dist/files/NewCMMath-Book.otf",
      "./NewCMMath-Regular.otf": "./dist/files/NewCMMath-Regular.otf",
    });
    expect(packageJson).not.toHaveProperty("main");
    expect(packageJson).not.toHaveProperty("types");
  });
});
