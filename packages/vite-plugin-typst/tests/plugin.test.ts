import { createWorkerHost } from "typst-wasm";
import { describe, expect, test } from "vitest";
import typst from "../src";
import { buildFixture, getChunk } from "./helpers";

describe("vite-plugin-typst fixtures", () => {
  test("builds a typst import into a JS module", async () => {
    const build = await buildFixture(
      "basic",
      typst({
        backend: "worker",
        worker: () =>
          createWorkerHost(
            new URL(import.meta.resolve("typst-wasm/worker/node")),
          ),
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
