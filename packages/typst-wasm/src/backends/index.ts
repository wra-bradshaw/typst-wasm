import type { FontInput, TypstCompilerOptions } from "../compiler/types";
import type { FileLoaderManager } from "../files/loaders";
import type {
  EngineCompileOptions,
  EngineCompileSuccess,
} from "../engine/types";
import { supportsJspiBackend, supportsWorkerBackend } from "./capabilities";
import type { ResolvedLogger } from "../logging";
import { DirectService } from "./direct";
import { WorkerService } from "./worker";

export { supportsJspiBackend, supportsWorkerBackend };

export type BackendKind = "auto" | "worker" | "jspi";

export type BackendSelection = Exclude<BackendKind, "auto"> | "none";

export type BackendService = {
  init(): Promise<void>;
  dispose(): Promise<void>;
  addFonts(...fonts: FontInput[]): Promise<void>;
  addFile(path: string, data: Uint8Array): Promise<void>;
  addSource(path: string, text: string): Promise<void>;
  removeFile(path: string): Promise<void>;
  clearFiles(): Promise<void>;
  listFiles(): Promise<string[]>;
  hasFile(path: string): Promise<boolean>;
  setMain(path: string): Promise<void>;
  compile(options: EngineCompileOptions): Promise<EngineCompileSuccess>;
};

export interface BackendOptions {
  fileLoaderManager: FileLoaderManager;
  logger?: ResolvedLogger;
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
          runtime.unavailableWorkerMessage ?? "Worker backend requires worker",
        );
      }
      return new WorkerService(options.fileLoaderManager, {
        createWorker: () => runtime.createWorker(compilerOptions),
        getCoreModule: compilerOptions.getCoreModule,
        logger: options.logger,
      });
    case "jspi":
      if (!compilerOptions.engine) {
        throw new Error("JSPI backend requires engine");
      }
      return new DirectService(
        options.fileLoaderManager,
        compilerOptions.engine,
        compilerOptions.getCoreModule,
      );
    case "none":
      throw new Error(
        "No compatible typst-wasm backend available. Requires Worker+SharedArrayBuffer+Atomics.wait or JSPI.",
      );
  }
};
