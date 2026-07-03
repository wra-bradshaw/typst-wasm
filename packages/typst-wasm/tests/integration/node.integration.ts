/// <reference types="node" />

import { readFile } from "node:fs/promises";
import { defaultFonts } from "@typst-wasm/fonts";
import { describe, expect, it } from "vitest";
import { supportsJspiBackend } from "../../src";
import { runCompilerIntegrationScenario } from "./scenario";

const wasmPath = new URL(
  "../../../engine-wasm/dist/typst_wasm_bg.wasm",
  import.meta.url,
);

describe("node integration (jspi backend)", () => {
  const runIfJspi = supportsJspiBackend() ? it : it.skip;

  runIfJspi(
    "covers compiler behavior across files, formats, options, and errors",
    async () => {
      const fontData = await Promise.all(
        defaultFonts.map((font) =>
          readFile(
            new URL(
              `../../../fonts/dist/files/${font.filename}`,
              import.meta.url,
            ),
          ),
        ),
      );

      const result = await runCompilerIntegrationScenario({
        runtime: "node",
        loadWasmBytes: () => readFile(wasmPath),
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
    },
  );
});
