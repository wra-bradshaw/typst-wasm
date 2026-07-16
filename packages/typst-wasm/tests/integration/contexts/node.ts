import { readFile } from "node:fs/promises";
import {
  createTypstCompiler,
  selectAutomaticBackendKind,
  supportsJspiBackend,
  supportsWorkerBackend,
} from "typst-wasm";
import { createWorkerThread } from "typst-wasm/worker/node";
import { fontFilenames, makePackageFetch } from "../spec/fixtures.ts";
import type {
  IntegrationBackend,
  IntegrationCompilerOptions,
  IntegrationRuntime,
} from "../spec/types.ts";
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
  const coreModules = {
    "engine.core.wasm": WebAssembly.compile(
      await readAsset("typst-wasm/engine/engine.core.wasm"),
    ),
    "engine.core2.wasm": WebAssembly.compile(
      await readAsset("typst-wasm/engine/engine.core2.wasm"),
    ),
    "engine.core3.wasm": WebAssembly.compile(
      await readAsset("typst-wasm/engine/engine.core3.wasm"),
    ),
  };
  const defaultWorker = () =>
    createWorkerThread(
      new URL(import.meta.resolve("typst-wasm/worker/worker-thread")),
    );

  const createCompiler = (options: IntegrationCompilerOptions = {}) =>
    createTypstCompiler({
      ...options,
      logger: options.logger,
      backend: options.backend ?? backend,
      coreModules: options.coreModules ?? coreModules,
      fetch: options.fetch ?? packageFixture.fetch,
      packageCache: options.packageCache ?? packageFixture.packageCache,
      packageBaseUrl: options.packageBaseUrl ?? "https://fixture.test",
      ...((backend === "worker" || options.backend === "worker") &&
      !options.worker
        ? { worker: defaultWorker }
        : {}),
    });
  const selectBackend = (options: IntegrationCompilerOptions = {}) => {
    const effective =
      options.backend === "worker" ||
      (options.backend === undefined && backend === "worker") ||
      (options.backend === "auto" && backend === "worker")
        ? {
            ...options,
            worker: options.worker ?? defaultWorker,
            coreModules: options.coreModules ?? coreModules,
          }
        : { ...options, coreModules: options.coreModules ?? coreModules };
    if (effective.backend === "worker")
      return supportsWorkerBackend() ? "worker" : "none";
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
