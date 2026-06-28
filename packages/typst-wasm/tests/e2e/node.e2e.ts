import { wasmBinaryUrl } from "@typst-wasm/engine-wasm";
import { defaultFonts } from "@typst-wasm/fonts";
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { supportsJspiBackend } from "../../src/compiler-backend";
import { runCompilerE2eScenario } from "./scenario";

describe("node e2e (jspi backend)", () => {
  it("compiles and supports iterative file operations", async () => {
    if (!supportsJspiBackend()) {
      throw new Error("Node E2E requires JSPI support (WebAssembly.Suspending and WebAssembly.promising).");
    }

    const wasmBytes = await readFile(wasmBinaryUrl);
    const moduleOrPath = new WebAssembly.Module(wasmBytes);
    const fontData = await Promise.all(defaultFonts.map((font) => font.load()));

    const result = await runCompilerE2eScenario({
      runtime: "node",
      moduleOrPath,
      fontData,
      backend: "jspi",
    });

    expect(result.firstOutputLength).toBeGreaterThan(0);
    expect(result.secondOutputLength).toBeGreaterThan(0);
    expect(result.filesBeforeClear).toContain("main.typ");
    expect(result.filesAfterClear).toEqual([]);
  });
});
