/// <reference types="node" />

import { defaultFonts } from "@typst-wasm/fonts";
import { describe, expect, it } from "vitest";
import { supportsJspiBackend } from "../../src/compiler-backend";
import { wasmBinaryUrl, wasmGlueUrl } from "../../src/wasm";
import { runCompilerE2eScenario } from "./scenario";

describe("node e2e (jspi backend)", () => {
  it("covers compiler behavior across files, formats, options, and errors", async () => {
    if (!supportsJspiBackend()) {
      throw new Error(
        "Node E2E requires JSPI support (WebAssembly.Suspending and WebAssembly.promising).",
      );
    }

    const fontData = await Promise.all(defaultFonts.map((font) => font.load()));

    const result = await runCompilerE2eScenario({
      runtime: "node",
      wasmURL: wasmBinaryUrl.href,
      glueURL: wasmGlueUrl.href,
      fontData,
      backend: "jspi",
    });

    expect(result.runtime).toBe("node");
    expect(result.svgOutputLength).toBeGreaterThan(0);
    expect(result.pdfFormatSeen).toBe(true);
    expect(result.pngOutputLength).toBeGreaterThan(0);
    expect(result.htmlOutputLength).toBeGreaterThan(0);
    expect(result.bundleFileCount).toBeGreaterThan(0);
    expect(result.filesBeforeClear).toContain("main.typ");
    expect(result.filesBeforeClear).toContain("partial.typ");
    expect(result.filesBeforeClear).toContain("data.txt");
    expect(result.filesAfterClear).toEqual([]);
  });
});
