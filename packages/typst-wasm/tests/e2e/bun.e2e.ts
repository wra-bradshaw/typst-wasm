import { wasmBinaryUrl } from "@typst-wasm/engine-wasm";
import { describe, expect, test } from "bun:test";
import { runCompilerE2eScenario } from "./scenario";

describe("bun e2e (worker backend)", () => {
  test("covers compiler behavior across files, formats, options, and errors", async () => {
    const moduleOrPath = wasmBinaryUrl.href;
    const result = await runCompilerE2eScenario({
      runtime: "bun",
      moduleOrPath,
      backend: "worker",
    });

    expect(result.runtime).toBe("bun");
    expect(result.svgOutputLength).toBeGreaterThan(0);
    expect(result.pdfFormatSeen).toBe(true);
    expect(result.pngOutputLength).toBeGreaterThan(0);
    expect(result.htmlFeatureErrorSeen).toBe(true);
    expect(result.bundleFeatureErrorSeen).toBe(true);
    expect(result.filesBeforeClear).toContain("main.typ");
    expect(result.filesBeforeClear).toContain("partial.typ");
    expect(result.filesBeforeClear).toContain("data.txt");
    expect(result.filesAfterClear).toEqual([]);
  }, 30000);
});
