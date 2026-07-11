/// <reference types="node" />

import { readFile } from "node:fs/promises";
import { describe, it } from "vitest";
import {
  createNodeWorkerHost,
  supportsJspiBackend,
  supportsWorkerBackend,
} from "typst-wasm";
import * as jspiEngine from "@typst-wasm/engine-wasm/jspi";
import { fontFilenames } from "./harness";
import {
  assertIntegrationScenarioResult,
  runCompilerIntegrationScenario,
} from "./scenario";
import { makePackageFetch } from "./import.scenario";

const fontData = async (): Promise<Uint8Array[]> =>
  await Promise.all(
    fontFilenames.map((filename) =>
      readFile(new URL(import.meta.resolve(`@typst-wasm/fonts/${filename}`))),
    ),
  );

describe("node integration", () => {
  const worker = () =>
    createNodeWorkerHost(
      new URL(import.meta.resolve("typst-wasm/worker/node")),
    );

  it("covers compiler behavior with the worker backend", async () => {
    if (!supportsWorkerBackend({ worker })) {
      throw new Error("Node integration requires the worker backend");
    }
    assertIntegrationScenarioResult(
      await runCompilerIntegrationScenario({
        runtime: "node",
        fontData: await fontData(),
        backend: "worker",
        ...(() => {
          const fixture = makePackageFetch();
          return {
            fetch: fixture.fetch,
            packageBaseUrl: "https://fixture.test",
            packageRequests: fixture.requests,
          };
        })(),
      }),
    );
  });

  it("covers compiler behavior with the JSPI backend", async () => {
    if (!supportsJspiBackend()) {
      throw new Error(
        "Node integration requires JSPI support in the configured Node runtime",
      );
    }
    const packageFixture = makePackageFetch();
    assertIntegrationScenarioResult(
      await runCompilerIntegrationScenario({
        runtime: "node",
        engine: jspiEngine,
        fontData: await fontData(),
        backend: "jspi",
        packageBaseUrl: "https://fixture.test",
        packageRequests: packageFixture.requests,
        fetch: packageFixture.fetch,
      }),
    );
  });
});
