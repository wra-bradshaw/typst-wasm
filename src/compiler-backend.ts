import { Context, Effect, Layer } from "effect";
import { DirectService } from "./direct-service";
import type { CompileResult } from "./index";
import type { WasmModuleOrPath } from "./wasm-module";
import { WorkerService } from "./worker-service";

export type CompilerBackendService = {
  readonly ready: Effect.Effect<void>;
  readonly init: (moduleOrPath: WasmModuleOrPath) => Effect.Effect<void, unknown>;
  readonly dispose: Effect.Effect<void, unknown>;
  readonly addFont: (data: Uint8Array) => Effect.Effect<void, unknown>;
  readonly addFile: (path: string, data: Uint8Array) => Effect.Effect<void, unknown>;
  readonly addSource: (path: string, text: string) => Effect.Effect<void, unknown>;
  readonly removeFile: (path: string) => Effect.Effect<void, unknown>;
  readonly clearFiles: Effect.Effect<void, unknown>;
  readonly listFiles: Effect.Effect<string[], unknown>;
  readonly hasFile: (path: string) => Effect.Effect<boolean, unknown>;
  readonly setMain: (path: string) => Effect.Effect<void, unknown>;
  readonly compile: () => Effect.Effect<CompileResult, unknown>;
};

export class CompilerBackend extends Context.Tag("CompilerBackend")<CompilerBackend, CompilerBackendService>() {}

export const WorkerBackendLayer = Layer.effect(
  CompilerBackend,
  Effect.map(WorkerService, (service) => service as CompilerBackendService),
).pipe(Layer.provide(WorkerService.Default));

export const JspiBackendLayer = Layer.effect(
  CompilerBackend,
  Effect.map(DirectService, (service) => service as CompilerBackendService),
).pipe(Layer.provide(DirectService.Default));

export const supportsWorkerBackend = (): boolean => typeof Worker !== "undefined" && typeof SharedArrayBuffer !== "undefined" && typeof Atomics !== "undefined" && typeof Atomics.wait === "function";

export const supportsJspiBackend = (): boolean => {
  const wasm = WebAssembly as unknown as {
    Suspending?: unknown;
    promising?: unknown;
  };

  return typeof wasm.Suspending === "function" && typeof wasm.promising === "function";
};

export const selectAutomaticBackendKind = (): "worker" | "jspi" | "none" => {
  if (supportsWorkerBackend()) return "worker";
  if (supportsJspiBackend()) return "jspi";
  return "none";
};

const AutoDetectedBackendLayer = Layer.suspend(() => {
  const selected = selectAutomaticBackendKind();

  switch (selected) {
    case "worker":
      return WorkerBackendLayer;
    case "jspi":
      return JspiBackendLayer;
    case "none":
      return Layer.fail(new Error("No compatible typst-wasm backend available. Requires Worker+SharedArrayBuffer+Atomics.wait or JSPI (WebAssembly.Suspending/promising)."));
  }
});

const ProvidedBackendPassthroughLayer = Layer.effect(
  CompilerBackend,
  Effect.map(CompilerBackend, (backend) => backend),
);

export const AutomaticBackendLayer = Layer.orElse(ProvidedBackendPassthroughLayer, () => AutoDetectedBackendLayer);
