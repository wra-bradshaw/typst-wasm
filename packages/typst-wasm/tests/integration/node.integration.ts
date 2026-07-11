/// <reference types="node" />

import { readFile } from "node:fs/promises";
import { describe, it } from "vitest";
import {
  createNodeWorkerHost,
  supportsJspiBackend,
  supportsWorkerBackend,
} from "../../src";
import * as jspiEngine from "@typst-wasm/engine-wasm/jspi";
import { fontFilenames } from "./harness";
import {
  assertIntegrationScenarioResult,
  runCompilerIntegrationScenario,
} from "./scenario";

const fontData = async (): Promise<Uint8Array[]> =>
  await Promise.all(
    fontFilenames.map((filename) =>
      readFile(
        new URL(`../../../fonts/dist/files/${filename}`, import.meta.url),
      ),
    ),
  );

describe("node integration", () => {
  const worker = () =>
    createNodeWorkerHost(new URL("../../dist/worker/node.js", import.meta.url));

  it.skipIf(
    !supportsWorkerBackend({
      worker,
    }),
  )("covers compiler behavior with the worker backend", async () => {
    assertIntegrationScenarioResult(
      await runCompilerIntegrationScenario({
        runtime: "node",
        fontData: await fontData(),
        backend: "worker",
      }),
    );
  });

  const runIfJspi = supportsJspiBackend() ? it : it.skip;

  runIfJspi("covers compiler behavior with the JSPI backend", async () => {
    assertIntegrationScenarioResult(
      await runCompilerIntegrationScenario({
        runtime: "node",
        engine: jspiEngine,
        fontData: await fontData(),
        backend: "jspi",
      }),
    );
  });
});
