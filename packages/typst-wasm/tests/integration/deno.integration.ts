/// <reference types="deno" />

import { runCompilerIntegrationScenario } from "./scenario.ts";

const wasmPath = new URL(
  "../../../engine-wasm/dist/typst_wasm_bg.wasm",
  import.meta.url,
);

Deno.test(
  "deno integration (worker backend) covers compiler behavior across files, formats, options, and errors",
  async () => {
    const result = await runCompilerIntegrationScenario({
      runtime: "deno",
      wasm: () => Deno.readFile(wasmPath),
    });

    if (result.runtime !== "deno") {
      throw new Error("Expected runtime to be deno");
    }
    if (!(result.svgOutputLength > 0)) {
      throw new Error("Expected SVG length to be > 0");
    }
    if (!result.pdfFormatSeen) {
      throw new Error("Expected PDF format to be seen");
    }
    if (!(result.pngOutputLength > 0)) {
      throw new Error("Expected PNG length to be > 0");
    }
    if (!(result.htmlOutputLength > 0)) {
      throw new Error("Expected HTML output length to be > 0");
    }
    if (!(result.bundleFileCount > 0)) {
      throw new Error("Expected bundle file count to be > 0");
    }
    if (!result.filesBeforeClear.includes("main.typ")) {
      throw new Error("Expected filesBeforeClear to include main.typ");
    }
    if (!result.filesBeforeClear.includes("partial.typ")) {
      throw new Error("Expected filesBeforeClear to include partial.typ");
    }
    if (!result.filesBeforeClear.includes("data.txt")) {
      throw new Error("Expected filesBeforeClear to include data.txt");
    }
    if (!(result.filesAfterClear.length === 0)) {
      throw new Error("Expected filesAfterClear to be empty");
    }
  },
);
