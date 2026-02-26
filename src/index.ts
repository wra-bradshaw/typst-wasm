import { Deferred, Effect } from "effect";
import type { CompileError, ListFilesError, HasFileError } from "./errors";
import type { WasmDiagnostic } from "./wasm/typst_wasm";
import type { WasmModuleOrPath } from "./wasm-module";
import { AutomaticBackendLayer, CompilerBackend } from "./compiler-backend";

export interface CompileResult {
  svg?: string;
  diagnostics: WasmDiagnostic[];
  internalError?: string;
}

export interface TypstCompilerOptions {
  moduleOrPath: WasmModuleOrPath;
  debug?: boolean;
  memoryPackageCacheCapacity?: number;
}

export type TypstCompilerServiceType = {
  readonly ready: Effect.Effect<void>;
  readonly init: (options: TypstCompilerOptions) => Effect.Effect<void>;
  readonly dispose: Effect.Effect<void>;
  readonly addFont: (data: Uint8Array) => Effect.Effect<void>;
  readonly addFile: (path: string, data: Uint8Array) => Effect.Effect<void>;
  readonly addSource: (path: string, text: string) => Effect.Effect<void>;
  readonly removeFile: (path: string) => Effect.Effect<void>;
  readonly clearFiles: Effect.Effect<void>;
  readonly listFiles: Effect.Effect<string[], ListFilesError>;
  readonly hasFile: (path: string) => Effect.Effect<boolean, HasFileError>;
  readonly setMain: (path: string) => Effect.Effect<void>;
  readonly compile: () => Effect.Effect<CompileResult, CompileError>;
};

export { SharedMemoryCommunication } from "./protocol";
export type { MainToWorkerMessage, WorkerToMainMessage } from "./messages";
export type { WasmModuleOrPath } from "./wasm-module";
export * from "./fonts/index";
export * from "./errors";
export { PackageManager } from "./package-manager";
export { CacheStorageService } from "./cache-abstraction";
export { WorkerService } from "./worker-service";
export { DirectService } from "./direct-service";
export { CompilerBackend, WorkerBackendLayer, JspiBackendLayer, AutomaticBackendLayer, supportsWorkerBackend, supportsJspiBackend, selectAutomaticBackendKind } from "./compiler-backend";

export class TypstCompilerService extends Effect.Service<TypstCompilerServiceType>()("TypstCompilerService", {
  accessors: true,
  scoped: Effect.gen(function* () {
    const backend = yield* CompilerBackend;
    const readyDeferred = yield* Deferred.make<void>();

    return {
      ready: Deferred.await(readyDeferred),

      init: (options: TypstCompilerOptions) =>
        Effect.gen(function* () {
          yield* backend.init(options.moduleOrPath);
          yield* backend.ready;
          yield* Deferred.succeed(readyDeferred, undefined);
        }),

      dispose: backend.dispose,
      addFont: backend.addFont,
      addFile: backend.addFile,
      addSource: backend.addSource,
      removeFile: backend.removeFile,
      clearFiles: backend.clearFiles,
      listFiles: backend.listFiles,
      hasFile: backend.hasFile,
      setMain: backend.setMain,
      compile: backend.compile,
    };
  }),
  dependencies: [AutomaticBackendLayer],
}) {}
