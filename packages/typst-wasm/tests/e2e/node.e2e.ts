import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
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

    const wasmBytes = await readFile(new URL("../../src/wasm/typst_wasm_bg.wasm", import.meta.url));
    const moduleOrPath = new WebAssembly.Module(wasmBytes);
    const fontFiles = ["NewCMMath-Regular.otf", "NewCMMath-Bold.otf", "NewCMMath-Book.otf"];
    const fontData = await Promise.all(
      fontFiles.map(async (fileName) => {
        const bytes = await readFile(new URL(`../../src/fonts/files/${fileName}`, import.meta.url));
        return new Uint8Array(bytes);
      }),
    );

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
