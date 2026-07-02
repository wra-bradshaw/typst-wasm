import type { TypstCompilerOptions } from "../compiler/types";
import type { FileLoaderManager } from "../files/loaders";
import type {
  WasmAssetUrls,
  WasmCompileOptions,
  WasmCompileOutput,
  WasmModule,
} from "../wasm/index";
import { supportsJspiBackend, supportsWorkerBackend } from "./capabilities";
import { DirectService } from "./direct";
import { WorkerService } from "./worker";

export { supportsJspiBackend, supportsWorkerBackend };

export type BackendKind = "auto" | "worker" | "jspi";

export type BackendSelection = Exclude<BackendKind, "auto"> | "none";

export type BackendService = {
  init(assets: WasmAssetUrls): Promise<void>;
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

export interface TypstRuntime {
  createWorker(): Worker;
  loadWasmModule(assets: WasmAssetUrls): Promise<WasmModule>;
  resolveAssets(options: TypstCompilerOptions): WasmAssetUrls;
}

export const selectAutomaticBackendKind = (): BackendSelection => {
  if (supportsWorkerBackend()) return "worker";
  if (supportsJspiBackend()) return "jspi";
  return "none";
};

export const createRuntimeBackend = (
  backend: BackendKind,
  options: BackendOptions,
  runtime: TypstRuntime,
): BackendService => {
  const selected = backend === "auto" ? selectAutomaticBackendKind() : backend;

  switch (selected) {
    case "worker":
      return new WorkerService(options.fileLoaderManager, {
        createWorker: runtime.createWorker,
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
