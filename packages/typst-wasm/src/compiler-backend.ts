import { DirectService } from "./direct-service";
import type { PackageManager } from "./package-manager";
import { WorkerService } from "./worker-service";
import type { WasmModuleOrPath } from "./wasm-module";
import type { WasmCompileOptions, WasmCompileOutput } from "./wasm";
export { supportsJspiBackend, supportsWorkerBackend } from "./backend-support";
import { supportsJspiBackend, supportsWorkerBackend } from "./backend-support";

export type CompilerBackendService = {
  init(moduleOrPath: WasmModuleOrPath): Promise<void>;
  dispose(): Promise<void>;
  addFont(data: Uint8Array): Promise<void>;
  addFile(path: string, data: Uint8Array): Promise<void>;
  addSource(path: string, text: string): Promise<void>;
  removeFile(path: string): Promise<void>;
  clearFiles(): Promise<void>;
  listFiles(): Promise<string[]>;
  hasFile(path: string): Promise<boolean>;
  setMain(path: string): Promise<void>;
  compile(options: WasmCompileOptions): Promise<WasmCompileOutput>;
};

export interface BackendFactoryOptions {
  packageManager: PackageManager;
  fetch?: typeof fetch;
}

export const selectAutomaticBackendKind = (): "worker" | "jspi" | "none" => {
  if (supportsWorkerBackend()) return "worker";
  if (supportsJspiBackend()) return "jspi";
  return "none";
};

export const createCompilerBackend = (
  backend: "auto" | "worker" | "jspi",
  options: BackendFactoryOptions,
): CompilerBackendService => {
  const selected = backend === "auto" ? selectAutomaticBackendKind() : backend;

  switch (selected) {
    case "worker":
      return new WorkerService(options.packageManager, options.fetch);
    case "jspi":
      return new DirectService(options.packageManager, options.fetch);
    case "none":
      throw new Error(
        "No compatible typst-wasm backend available. Requires Worker+SharedArrayBuffer+Atomics.wait or JSPI.",
      );
  }
};
