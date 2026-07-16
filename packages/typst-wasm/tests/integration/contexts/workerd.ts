import {
  createTypstCompiler,
  selectAutomaticBackendKind,
  supportsJspiBackend,
  supportsWorkerBackend,
} from "typst-wasm";
import { fontFilenames, makePackageFetch } from "../spec/fixtures.ts";
import type {
  IntegrationCompilerOptions,
  IntegrationContext,
} from "../spec/types.ts";

export type WorkerdAssets = {
  coreModules: Readonly<Record<string, WebAssembly.Module>>;
  fonts: readonly Uint8Array[];
};

export const makeWorkerdContext = async (
  assets: WorkerdAssets,
): Promise<IntegrationContext> => {
  const fixture = makePackageFetch();
  const fonts = fontFilenames.map((_, index) => assets.fonts[index]);
  const coreModules = {
    "engine.core.wasm": assets.coreModules["engine.core.wasm"],
    "engine.core2.wasm": assets.coreModules["engine.core2.wasm"],
    "engine.core3.wasm": assets.coreModules["engine.core3.wasm"],
  };
  const createCompiler = (options: IntegrationCompilerOptions = {}) =>
    createTypstCompiler({
      ...options,
      logger: options.logger,
      backend: options.backend ?? "jspi",
      coreModules: options.coreModules ?? coreModules,
      fetch: options.fetch ?? fixture.fetch,
      packageCache: options.packageCache ?? fixture.packageCache,
      packageBaseUrl: options.packageBaseUrl ?? "https://fixture.test",
    });
  const selectBackend = (options: IntegrationCompilerOptions = {}) =>
    options.backend === "worker"
      ? Boolean(options.worker) && supportsWorkerBackend()
        ? "worker"
        : "none"
      : options.backend === "jspi"
        ? supportsJspiBackend()
          ? "jspi"
          : "none"
        : selectAutomaticBackendKind({
            ...options,
            coreModules: options.coreModules ?? coreModules,
          });
  return {
    runtime: "workerd",
    backend: "jspi",
    cell: "workerd:jspi",
    selectedBackend: "jspi",
    selectBackend,
    expectUnsupportedBackend: async () => {
      if (selectBackend({ backend: "worker" }) !== "none") {
        throw new Error("worker backend is available in workerd");
      }
      try {
        const compiler = await createCompiler({ backend: "worker" });
        await compiler.dispose();
      } catch {
        return;
      }
      throw new Error("workerd worker backend unexpectedly succeeded");
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
    fetch: fixture.fetch,
    fonts,
    packageRequests: fixture.requests,
  };
};
