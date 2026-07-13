/// <reference types="deno" />

import {
  createTypstCompiler,
  selectAutomaticBackendKind,
  supportsJspiBackend,
  supportsWorkerBackend,
  type TypstCompilerOptions,
  type WorkerHost,
} from "typst-wasm/browser";
import * as jspiEngine from "@typst-wasm/engine-wasm/jspi";
import { fontFilenames, makePackageFetch } from "../spec/fixtures.ts";
import type { IntegrationBackend } from "../spec/types.ts";
import type { IntegrationContext } from "../spec/types.ts";

const asset = (specifier: string) => new URL(import.meta.resolve(specifier));

const denoWorker = (url: string | URL): WorkerHost => {
  const worker = new Worker(url, { type: "module" });
  return {
    listen: (onMessage, onError) => {
      worker.onmessage = (event) => onMessage(event.data);
      worker.onerror = (event) => onError(event.error ?? event.message);
    },
    postMessage: (data) => worker.postMessage(data),
    terminate: () => worker.terminate(),
  };
};

export const makeDenoContext = async (
  backend: IntegrationBackend,
): Promise<IntegrationContext> => {
  const fixture = makePackageFetch();
  const fontData = await Promise.all(
    fontFilenames.map(
      async (name) =>
        new Uint8Array(
          await (await fetch(asset(`@typst-wasm/fonts/${name}`))).arrayBuffer(),
        ),
    ),
  );
  const getCoreModule = async (name: string) =>
    WebAssembly.compile(
      await (
        await fetch(asset(`@typst-wasm/engine-wasm/worker/${name}`))
      ).arrayBuffer(),
    );
  const worker = () => denoWorker(asset("typst-wasm/worker/browser"));
  const createCompiler = (options: TypstCompilerOptions = {}) =>
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
  const selectBackend = (options: TypstCompilerOptions = {}) => {
    if (options.backend === "worker")
      return supportsWorkerBackend({
        ...options,
        worker: options.worker ?? worker,
      })
        ? "worker"
        : "none";
    if (options.backend === "jspi")
      return supportsJspiBackend() ? "jspi" : "none";
    return selectAutomaticBackendKind({
      ...options,
      worker: options.worker ?? worker,
    });
  };
  return {
    runtime: "deno",
    backend,
    cell: `deno:${backend}`,
    selectedBackend: backend,
    selectBackend,
    expectUnsupportedBackend: async () => {
      const unsupported = backend === "worker" ? "jspi" : "worker";
      if (selectBackend({ backend: unsupported }) !== "none") {
        throw new Error(`backend ${unsupported} is available in deno`);
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
    fonts: fontData,
    packageRequests: fixture.requests,
  };
};
