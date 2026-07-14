import { readFile } from "node:fs/promises";
import {
  createWorkerThread,
  createTypstCompiler,
  selectAutomaticBackendKind,
  supportsJspiBackend,
  supportsWorkerBackend,
} from "typst-wasm/node";
import * as jspiEngine from "@typst-wasm/engine-wasm/jspi";
import { fontFilenames, makePackageFetch } from "../spec/fixtures.ts";
import type { IntegrationBackend, IntegrationRuntime } from "../spec/types.ts";
import type { IntegrationContext } from "../spec/types.ts";

const readAsset = async (specifier: string) =>
  new Uint8Array(await readFile(new URL(import.meta.resolve(specifier))));

export const makeNodeContext = async (
  backend: IntegrationBackend,
  runtime: IntegrationRuntime = "node",
): Promise<IntegrationContext> => {
  const packageFixture = makePackageFetch();
  const fonts = await Promise.all(
    fontFilenames.map((name) => readAsset(`@typst-wasm/fonts/${name}`)),
  );
  const getCoreModule = async (name: string) =>
    WebAssembly.compile(
      await readAsset(`@typst-wasm/engine-wasm/worker/${name}`),
    );
  const defaultWorker = () =>
    createWorkerThread(new URL(import.meta.resolve("typst-wasm/worker/worker-thread")));

  const createCompiler = (
    options: Parameters<typeof createTypstCompiler>[0] = {},
  ) =>
    createTypstCompiler({
      ...options,
      logger: options.logger,
      backend: options.backend ?? backend,
      engine:
        options.engine ??
        (options.backend === "jspi" ||
        (options.backend === "auto" && backend === "jspi") ||
        (options.backend === undefined && backend === "jspi")
          ? jspiEngine
          : undefined),
      getCoreModule,
      fetch: options.fetch ?? packageFixture.fetch,
      packageCache: options.packageCache ?? packageFixture.packageCache,
      packageBaseUrl: options.packageBaseUrl ?? "https://fixture.test",
      ...((backend === "worker" || options.backend === "worker") &&
      !options.worker
        ? { worker: defaultWorker }
        : {}),
    });
  const selectBackend = (
    options: Parameters<typeof createTypstCompiler>[0] = {},
  ) => {
    const effective =
      options.backend === "worker" ||
      (options.backend === undefined && backend === "worker") ||
      (options.backend === "auto" && backend === "worker")
        ? { ...options, worker: options.worker ?? defaultWorker }
        : options;
    if (effective.backend === "worker")
      return supportsWorkerBackend(effective) ? "worker" : "none";
    if (effective.backend === "jspi")
      return supportsJspiBackend() ? "jspi" : "none";
    return selectAutomaticBackendKind(effective);
  };
  return {
    runtime,
    backend,
    cell: `${runtime}:${backend}`,
    selectedBackend: backend,
    selectBackend,
    expectUnsupportedBackend: async () => {
      const unsupported = backend === "worker" ? "jspi" : "worker";
      if (selectBackend({ backend: unsupported }) !== "none") {
        throw new Error(`backend ${unsupported} is available in ${runtime}`);
      }
      try {
        const compiler = await createCompiler({ backend: unsupported });
        await compiler.dispose();
      } catch (error) {
        if (error instanceof Error) return;
        throw error;
      }
      throw new Error(
        `unsupported backend ${unsupported} unexpectedly succeeded`,
      );
    },
    createCompiler,
    withCompiler: async (run, options) => {
      const compiler = await createCompiler(options);
      try {
        return await run(compiler);
      } finally {
        await compiler.dispose();
      }
    },
    fetch: packageFixture.fetch,
    fonts,
    packageRequests: packageFixture.requests,
  };
};
