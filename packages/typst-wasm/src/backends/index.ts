import type { TypstCompilerOptions } from "../compiler/types";
import type { FileLoaderManager } from "../files/loaders";
import type {
  WasmBytes,
  WasmCompileOptions,
  WasmCompileOutput,
  WasmModule,
  WasmModuleSource,
} from "../wasm/index";
import { supportsJspiBackend, supportsWorkerBackend } from "./capabilities";
import { DirectService } from "./direct";
import { WorkerService } from "./worker";

export { supportsJspiBackend, supportsWorkerBackend };

export type BackendKind = "auto" | "worker" | "jspi";

export type BackendSelection = Exclude<BackendKind, "auto"> | "none";

export type BackendService = {
  init(wasmSource?: WasmBytes | WasmModuleSource): Promise<void>;
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

export interface BackendOptions {
  fileLoaderManager: FileLoaderManager;
}

interface RuntimeWorkerHost {
  listen(
    onMessage: (data: unknown) => void,
    onError: (cause: unknown) => void,
  ): void;
  postMessage(data: unknown): void;
  terminate(): void | Promise<unknown>;
}

export interface TypstRuntime {
  createWorker(options: TypstCompilerOptions): RuntimeWorkerHost;
  loadWasmModule(wasmSource: WasmBytes | WasmModuleSource): Promise<WasmModule>;
  loadWasmSource(
    options: TypstCompilerOptions,
  ): Promise<WasmBytes | WasmModuleSource | undefined>;
  supportsWorkerBackend(options: TypstCompilerOptions): boolean;
  supportsJspiBackend(): boolean;
  unavailableWorkerMessage?: string;
}

export const selectAutomaticBackendKind = (
  runtime: TypstRuntime,
  options: TypstCompilerOptions,
): BackendSelection => {
  if (runtime.supportsWorkerBackend(options)) return "worker";
  if (runtime.supportsJspiBackend()) return "jspi";
  return "none";
};

export const createRuntimeBackend = (
  backend: BackendKind,
  options: BackendOptions,
  runtime: TypstRuntime,
  compilerOptions: TypstCompilerOptions,
): BackendService => {
  const selected =
    backend === "auto"
      ? selectAutomaticBackendKind(runtime, compilerOptions)
      : backend;

  switch (selected) {
    case "worker":
      if (!runtime.supportsWorkerBackend(compilerOptions)) {
        throw new Error(
          runtime.unavailableWorkerMessage ??
            "Worker backend requires assets.worker",
        );
      }
      return new WorkerService(options.fileLoaderManager, {
        createWorker: () => runtime.createWorker(compilerOptions),
      });
    case "jspi":
      return new DirectService(options.fileLoaderManager, {
        loadWasmModule: runtime.loadWasmModule,
      });
    case "none":
      throw new Error(
        "No compatible typst-wasm backend available. Requires Worker+SharedArrayBuffer+Atomics.wait or JSPI.",
      );
  }
};
