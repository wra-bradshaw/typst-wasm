/// <reference types="node" />

import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  createNodeWorkerHost,
  supportsJspiBackend,
  supportsWorkerBackend,
} from "../../src";
import * as jspiEngine from "@typst-wasm/engine-wasm/jspi";
import { fontFilenames } from "./harness";
import { runCompilerIntegrationScenario } from "./scenario";

const fontData = async (): Promise<Uint8Array[]> =>
  await Promise.all(
    fontFilenames.map((filename) =>
      readFile(
        new URL(`../../../fonts/dist/files/${filename}`, import.meta.url),
      ),
    ),
  );

const expectScenarioResult = (
  result: Awaited<ReturnType<typeof runCompilerIntegrationScenario>>,
) => {
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
};

describe("node integration", () => {
  const worker = () =>
    createNodeWorkerHost(new URL("../../dist/worker/node.js", import.meta.url));

  it.skipIf(
    !supportsWorkerBackend({
      worker,
    }),
  )("covers compiler behavior with the worker backend", async () => {
    expectScenarioResult(
      await runCompilerIntegrationScenario({
        runtime: "node",
        fontData: await fontData(),
        backend: "worker",
      }),
    );
  });

  const runIfJspi = supportsJspiBackend() ? it : it.skip;

  runIfJspi("covers compiler behavior with the JSPI backend", async () => {
    expectScenarioResult(
      await runCompilerIntegrationScenario({
        runtime: "node",
        engine: jspiEngine,
        fontData: await fontData(),
        backend: "jspi",
      }),
    );
  });
});
