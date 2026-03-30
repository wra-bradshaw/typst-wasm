import { wasmBinaryUrl } from "@typst-wasm/engine-wasm";
import { defaultFonts } from "@typst-wasm/fonts";
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { JspiBackendLayer } from "../../dist/index.js";
import { runCompilerE2eScenario } from "./scenario";

const hasJspiSupport = (): boolean => {
  const wasm = WebAssembly as unknown as {
    Suspending?: unknown;
    promising?: unknown;
  };

  return typeof wasm.Suspending === "function" && typeof wasm.promising === "function";
};

describe("node e2e (jspi backend)", () => {
  it("compiles and supports iterative file operations", async () => {
    if (!hasJspiSupport()) {
      throw new Error("Node E2E requires JSPI support (WebAssembly.Suspending and WebAssembly.promising).");
    }

    const wasmBytes = await readFile(wasmBinaryUrl);
    const moduleOrPath = new WebAssembly.Module(wasmBytes);
    const fontData = await Promise.all(defaultFonts.map((font) => font.load()));

    const result = await runCompilerE2eScenario({
      runtime: "node",
      moduleOrPath,
      fontData,
      backendLayer: JspiBackendLayer,
    });

    expect(result.firstSvgLength).toBeGreaterThan(0);
    expect(result.secondSvgLength).toBeGreaterThan(0);
    expect(result.filesBeforeClear).toContain("main.typ");
    expect(result.filesAfterClear).toEqual([]);
  });
});
