/// <reference types="bun" />

import { describe, expect, test } from "bun:test";
import { supportsJspiBackend } from "../../src/index";
import * as jspiEngine from "@typst-wasm/engine-wasm/jspi";
import { runCompilerIntegrationScenario } from "./scenario";

const expectScenarioResult = (
  result: Awaited<ReturnType<typeof runCompilerIntegrationScenario>>,
) => {
  expect(result.runtime).toBe("bun");
  expect(result.svgOutputLength).toBeGreaterThan(0);
  expect(result.pdfFormatSeen).toBe(true);
  expect(result.pngOutputLength).toBeGreaterThan(0);
  expect(result.htmlOutputLength).toBeGreaterThan(0);
  expect(result.bundleFileCount).toBeGreaterThan(0);
  expect(result.filesBeforeClear).toContain("main.typ");
  expect(result.filesBeforeClear).toContain("partial.typ");
  expect(result.filesBeforeClear).toContain("data.txt");
  expect(result.filesAfterClear).toEqual([]);
};

describe("bun integration", () => {
  test("covers compiler behavior with the worker backend", async () => {
    const result = await runCompilerIntegrationScenario({
      runtime: "bun",
      backend: "worker",
    });

    expectScenarioResult(result);
  }, 30000);

  const runIfJspi = supportsJspiBackend() ? test : test.skip;

  runIfJspi(
    "covers compiler behavior with the JSPI backend",
    async () => {
      expectScenarioResult(
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
