import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { describe, expect, test } from "vitest";
import { supportsJspiBackend } from "typst-wasm";
import typst from "../src";
import { buildFixture, getChunk } from "./helpers";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const wasmPath = path.resolve(
  dirname,
  "../../engine-wasm/dist/typst_wasm_bg.wasm",
);
const gluePath = path.resolve(
  dirname,
  "../../engine-wasm/dist/typst_wasm_bg.js",
);

describe("vite-plugin-typst fixtures", () => {
  const runIfJspi = supportsJspiBackend() ? test : test.skip;

  runIfJspi("builds a typst import into a JS module", async () => {
    const build = await buildFixture(
      "basic",
      typst({
        backend: "jspi",
        wasmURL: pathToFileURL(wasmPath),
        glueURL: pathToFileURL(gluePath),
      }),
    );
    try {
      const main = getChunk(build, (chunk) => chunk.isEntry);

      expect(main.code).toContain("Hello from Typst");
      expect(main.code).toContain("metadata");
      expect(main.code).toContain("dependencies");
      expect(main.code).toContain("Typst Fixture");
    } finally {
      await build.cleanup();
    }
  });
});
