/// <reference types="bun" />

import { describe, test } from "bun:test";
import { supportsJspiBackend, supportsWorkerBackend } from "typst-wasm";
import * as jspiEngine from "@typst-wasm/engine-wasm/jspi";
import {
  assertIntegrationScenarioResult,
  runCompilerIntegrationScenario,
} from "./scenario";

describe("bun integration", () => {
  test("covers compiler behavior with the worker backend", async () => {
    if (
      !supportsWorkerBackend({
        worker: () => ({
          listen: () => {},
          postMessage: () => {},
          terminate: () => {},
        }),
      })
    ) {
      throw new Error("Bun integration requires the worker backend");
    }
    const result = await runCompilerIntegrationScenario({
      runtime: "bun",
      backend: "worker",
    });

    assertIntegrationScenarioResult(result);
  }, 30000);

  test("covers compiler behavior with the JSPI backend", async () => {
    if (!supportsJspiBackend()) {
      throw new Error(
        "Bun integration requires JSPI support in the configured Bun runtime",
      );
    }
    assertIntegrationScenarioResult(
      await runCompilerIntegrationScenario({
        runtime: "bun",
        engine: jspiEngine,
        backend: "jspi",
      }),
    );
  }, 30000);
});
