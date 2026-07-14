import {
  createTypstCompiler,
  createWebWorker,
  selectAutomaticBackendKind,
  supportsJspiBackend,
  supportsWorkerBackend,
} from "typst-wasm/browser";
import * as jspiEngine from "@typst-wasm/engine-wasm/jspi";
import { fontFilenames, makePackageFetch } from "../spec/fixtures.ts";
import type { IntegrationBackend, IntegrationRuntime } from "../spec/types.ts";
import type { IntegrationContext } from "../spec/types.ts";

export type BrowserAssets = {
  worker: string;
  cores: Record<string, string>;
  fonts: string[];
};

export const makeBrowserContext = async (
  runtime: Extract<IntegrationRuntime, "chromium" | "firefox" | "webkit">,
  backend: IntegrationBackend,
  assets?: BrowserAssets,
  baseUrl = location.origin,
): Promise<IntegrationContext> => {
  const fixture = makePackageFetch();
  const asset = (path: string) => `${baseUrl}/${path.replace(/^\//, "")}`;
  const fetchBytes = async (url: string) =>
    new Uint8Array(await (await fetch(url)).arrayBuffer());
  const fonts = await Promise.all(
    (assets?.fonts ?? fontFilenames.map((name) => asset(`fonts/${name}`))).map(
      fetchBytes,
    ),
  );
  const getCoreModule = async (name: string) =>
    WebAssembly.compile(
      await fetchBytes(assets?.cores[name] ?? asset(`wasm/${name}`)),
    );
  const worker = () =>
    createWebWorker(assets?.worker ?? asset("worker/web-worker.js"));
  const createCompiler = (
    options: Parameters<typeof createTypstCompiler>[0] = {},
  ) =>
    createTypstCompiler({
      ...options,
      logger: options.logger,
      backend: options.backend ?? backend,
      engine:
        options.engine ??
        (options.backend === "jspi" || backend === "jspi"
          ? jspiEngine
          : undefined),
      getCoreModule,
      worker: options.worker ?? worker,
      fetch: options.fetch ?? fixture.fetch,
      packageCache: options.packageCache ?? fixture.packageCache,
      packageBaseUrl: options.packageBaseUrl ?? "https://fixture.test",
    });
  const selectBackend = (
    options: Parameters<typeof createTypstCompiler>[0] = {},
  ) =>
    options.backend === "worker"
      ? supportsWorkerBackend({
          ...options,
          worker: options.worker ?? worker,
        })
        ? "worker"
        : "none"
      : options.backend === "jspi"
        ? supportsJspiBackend()
          ? "jspi"
          : "none"
        : selectAutomaticBackendKind({
            ...options,
            worker: options.worker ?? worker,
          });
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
      } catch {
        return;
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
    fetch: fixture.fetch,
    fonts,
    packageRequests: fixture.requests,
  };
};
