import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createWorkerHost } from "typst-wasm";
import { describe, expect, test } from "vitest";
import typst from "../src";
import { buildFixture, getChunk } from "./helpers";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const wasmPath = path.resolve(
  dirname,
  "../../engine-wasm/dist/typst_wasm_bg.wasm",
);

describe("vite-plugin-typst fixtures", () => {
  test("builds a typst import into a JS module", async () => {
    const build = await buildFixture(
      "basic",
      typst({
        backend: "worker",
        assets: {
          worker: () =>
            createWorkerHost(
              new URL(import.meta.resolve("typst-wasm/worker/node")),
            ),
          wasm: () => readFile(wasmPath),
        },
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
