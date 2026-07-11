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
  ignore: !supportsDenoWorkerBackend(),
  fn: async () => {
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
  ignore: !supportsJspiBackend(),
  fn: async () => {
    assertIntegrationScenarioResult(
      await runCompilerIntegrationScenario({
        runtime: "deno",
        engine: jspiEngine,
        backend: "jspi",
      }),
    );
  },
});
