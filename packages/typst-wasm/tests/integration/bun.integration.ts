/// <reference types="bun" />

import { describe, test } from "bun:test";
import { supportsJspiBackend } from "../../src/index";
import * as jspiEngine from "@typst-wasm/engine-wasm/jspi";
import {
  assertIntegrationScenarioResult,
  runCompilerIntegrationScenario,
} from "./scenario";

describe("bun integration", () => {
  test("covers compiler behavior with the worker backend", async () => {
    const result = await runCompilerIntegrationScenario({
      runtime: "bun",
      backend: "worker",
    });

    assertIntegrationScenarioResult(result);
  }, 30000);

  const runIfJspi = supportsJspiBackend() ? test : test.skip;

  runIfJspi(
    "covers compiler behavior with the JSPI backend",
    async () => {
      assertIntegrationScenarioResult(
        await runCompilerIntegrationScenario({
          runtime: "bun",
          engine: jspiEngine,
          backend: "jspi",
        }),
      );
    },
    30000,
  );
});
