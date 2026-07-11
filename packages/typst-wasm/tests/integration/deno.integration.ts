/// <reference types="deno" />

import { runCompilerIntegrationScenario } from "./scenario.ts";
import { supportsJspiBackend, supportsWorkerBackend } from "typst-wasm";
import * as jspiEngine from "@typst-wasm/engine-wasm/jspi";

const supportsDenoWorkerBackend = (): boolean =>
  typeof Worker !== "undefined" &&
  typeof SharedArrayBuffer !== "undefined" &&
  typeof Atomics.wait === "function" &&
  supportsWorkerBackend({
    worker: () => ({
      listen: () => {},
      postMessage: () => {},
      terminate: () => {},
    }),
  });

const assertScenarioResult = (
  result: Awaited<ReturnType<typeof runCompilerIntegrationScenario>>,
) => {
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
};

Deno.test({
  name: "deno integration covers compiler behavior with the worker backend",
  ignore: !supportsDenoWorkerBackend(),
  fn: async () => {
    assertScenarioResult(
      await runCompilerIntegrationScenario({
        runtime: "deno",
        backend: "worker",
      }),
    );
  },
});

Deno.test({
  name: "deno integration covers compiler behavior with the JSPI backend",
  ignore: !supportsJspiBackend(),
  fn: async () => {
    assertScenarioResult(
      await runCompilerIntegrationScenario({
        runtime: "deno",
        engine: jspiEngine,
        backend: "jspi",
      }),
    );
  },
});
