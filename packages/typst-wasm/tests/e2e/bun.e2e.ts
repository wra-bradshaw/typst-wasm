/// <reference types="bun" />

import { describe, expect, test } from "bun:test";
import { wasmBinaryUrl, wasmGlueUrl } from "../../src/wasm";
import { runCompilerE2eScenario } from "./scenario";

describe("bun e2e (worker backend)", () => {
  test("covers compiler behavior across files, formats, options, and errors", async () => {
    const result = await runCompilerE2eScenario({
      runtime: "bun",
      wasmURL: wasmBinaryUrl.href,
      glueURL: wasmGlueUrl.href,
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
