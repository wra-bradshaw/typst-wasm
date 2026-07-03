/// <reference types="bun" />

import { describe, expect, test } from "bun:test";
import { wasmBinaryUrl } from "../../src/wasm";
import { runCompilerIntegrationScenario } from "./scenario";

describe("bun integration (worker backend)", () => {
  test("covers compiler behavior across files, formats, options, and errors", async () => {
    const result = await runCompilerIntegrationScenario({
      runtime: "bun",
      loadWasmBytes: () => Bun.file(wasmBinaryUrl).arrayBuffer(),
      backend: "worker",
    });

    expect(result.runtime).toBe("bun");
    expect(result.svgOutputLength).toBeGreaterThan(0);
    expect(result.pdfFormatSeen).toBe(true);
    expect(result.pngOutputLength).toBeGreaterThan(0);
    expect(result.htmlOutputLength).toBeGreaterThan(0);
    expect(result.bundleFileCount).toBeGreaterThan(0);
    expect(result.filesBeforeClear).toContain("main.typ");
    expect(result.filesBeforeClear).toContain("partial.typ");
    expect(result.filesBeforeClear).toContain("data.txt");
    expect(result.filesAfterClear).toEqual([]);
  }, 30000);
});
