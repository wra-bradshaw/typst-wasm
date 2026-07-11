/// <reference types="deno" />

import {
  assertIntegrationScenarioResult,
  runCompilerIntegrationScenario,
} from "./scenario.ts";
import { supportsJspiBackend, supportsWorkerBackend } from "typst-wasm";
import * as jspiEngine from "@typst-wasm/engine-wasm/jspi";

const supportsDenoWorkerBackend = (): boolean =>
  typeof Worker !== "undefined" &&
  typeof SharedArrayBuffer !== "undefined" &&
  typeof Atomics !== "undefined" &&
  typeof Atomics.wait === "function" &&
  supportsWorkerBackend({
    worker: () => ({
      listen: () => {},
      postMessage: () => {},
      terminate: () => {},
    }),
  });

Deno.test({
  name: "deno integration covers compiler behavior with the worker backend",
  fn: async () => {
    if (!supportsDenoWorkerBackend()) {
      throw new Error(
        "Deno integration requires Worker, SharedArrayBuffer, and Atomics.wait support",
      );
    }
    assertIntegrationScenarioResult(
      await runCompilerIntegrationScenario({
        runtime: "deno",
        backend: "worker",
      }),
    );
  },
});

Deno.test({
  name: "deno integration covers compiler behavior with the JSPI backend",
  fn: async () => {
    if (!supportsJspiBackend()) {
      throw new Error(
        "Deno integration requires JSPI support in the configured Deno runtime",
      );
    }
    assertIntegrationScenarioResult(
      await runCompilerIntegrationScenario({
        runtime: "deno",
        engine: jspiEngine,
        backend: "jspi",
      }),
    );
  },
});
