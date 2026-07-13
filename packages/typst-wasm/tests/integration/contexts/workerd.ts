import {
  createTypstCompiler,
  selectAutomaticBackendKind,
  supportsJspiBackend,
  supportsWorkerBackend,
} from "typst-wasm/workerd";
import * as jspiEngine from "@typst-wasm/engine-wasm/jspi";
import { fontFilenames, makePackageFetch } from "../spec/fixtures.ts";
import type { IntegrationContext } from "../spec/types.ts";

export type WorkerdAssets = {
  coreModules: Readonly<Record<string, WebAssembly.Module>>;
  fonts: readonly Uint8Array[];
};

export const makeWorkerdContext = async (
  assets: WorkerdAssets,
): Promise<IntegrationContext> => {
  const fixture = makePackageFetch();
  const fonts = fontFilenames.map((_, index) => assets.fonts[index]);
  const getCoreModule = async (name: string) => {
    const module = assets.coreModules[name];
    if (!module) throw new Error(`missing Workerd core module: ${name}`);
    return module;
  };
  const createCompiler = (
    options: Parameters<typeof createTypstCompiler>[0] = {},
  ) =>
    createTypstCompiler({
      ...options,
      logger: options.logger,
      backend: options.backend ?? "jspi",
      engine: options.engine ?? jspiEngine,
      getCoreModule,
      fetch: options.fetch ?? fixture.fetch,
      packageCache: options.packageCache ?? fixture.packageCache,
      packageBaseUrl: options.packageBaseUrl ?? "https://fixture.test",
    });
  const selectBackend = (
    options: Parameters<typeof createTypstCompiler>[0] = {},
  ) =>
    options.backend === "worker"
      ? supportsWorkerBackend(options)
        ? "worker"
        : "none"
      : options.backend === "jspi"
        ? supportsJspiBackend()
          ? "jspi"
          : "none"
        : selectAutomaticBackendKind(options);
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
        const compiler = await createCompiler({
          backend: "worker",
          // The runtime must reject before this host is ever used.
          worker: () => ({
            listen: () => {},
            postMessage: () => {},
            terminate: () => {},
          }),
        });
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
