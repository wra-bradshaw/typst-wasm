/// <reference types="deno" />

import { wasmBinaryUrl } from "../../src/wasm.ts";
import { runCompilerE2eScenario } from "./scenario.ts";

Deno.test(
  "deno e2e (worker backend) covers compiler behavior across files, formats, options, and errors",
  async () => {
    const moduleOrPath = wasmBinaryUrl.href;
    const result = await runCompilerE2eScenario({
      runtime: "deno",
      moduleOrPath,
      backend: "worker",
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
    if (!result.htmlFeatureErrorSeen) {
      throw new Error("Expected HTML feature error to be seen");
    }
    if (!result.bundleFeatureErrorSeen) {
      throw new Error("Expected bundle feature error to be seen");
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
