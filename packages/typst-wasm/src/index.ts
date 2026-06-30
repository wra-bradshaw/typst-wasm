import {
  createCompilerBackend,
  type CompilerBackendService,
} from "./compiler-backend";
import { CompileError } from "./errors";
import { PackageManager } from "./package-manager";
import { toWasmCompileOptions, type WasmCompileOutput } from "./wasm";
import type {
  CompileOptions,
  CompileResult,
  TypstCompiler,
  TypstCompilerOptions,
} from "./types";

const hasErrorDiagnostics = (diagnostics: { severity: string }[]): boolean =>
  diagnostics.some((diagnostic) => diagnostic.severity === "error");

const extractErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
};

const normalizeCompileResult = (result: WasmCompileOutput): CompileResult => {
  const diagnostics = result.diagnostics;

  switch (result.format) {
    case "pdf":
      return {
        format: "pdf",
        output: result.output_bytes ?? new Uint8Array(),
        diagnostics,
      };
    case "png":
      return {
        format: "png",
        pages: result.pages.map((page) => ({
          page: page.page,
          output: page.output_bytes ?? new Uint8Array(),
        })),
        diagnostics,
      };
    case "svg":
      return {
        format: "svg",
        pages: result.pages.map((page) => ({
          page: page.page,
          output: page.output_text ?? "",
        })),
        diagnostics,
      };
    case "html":
      return {
        format: "html",
        output: result.output_text ?? "",
        diagnostics,
      };
    case "bundle":
      return {
        format: "bundle",
        files: result.files.map((file) => ({
          path: file.path,
          data: file.data,
          mediaType: file.media_type ?? undefined,
        })),
        diagnostics,
      };
    default:
      throw new CompileError(
        `Unsupported compile output format: ${result.format}`,
        {
          diagnostics,
        },
      );
  }
};

class PromiseTypstCompiler implements TypstCompiler {
  constructor(private readonly backend: CompilerBackendService) {}

  addFont(data: Uint8Array): Promise<void> {
    return this.backend.addFont(data);
  }

  addFile(path: string, data: Uint8Array): Promise<void> {
    return this.backend.addFile(path, data);
  }

  addSource(path: string, text: string): Promise<void> {
    return this.backend.addSource(path, text);
  }

  removeFile(path: string): Promise<void> {
    return this.backend.removeFile(path);
  }

  clearFiles(): Promise<void> {
    return this.backend.clearFiles();
  }

  listFiles(): Promise<string[]> {
    return this.backend.listFiles();
  }

  hasFile(path: string): Promise<boolean> {
    return this.backend.hasFile(path);
  }

  setMain(path: string): Promise<void> {
    return this.backend.setMain(path);
  }

  async compile(options: CompileOptions = {}): Promise<CompileResult> {
    if (options.main) {
      await this.setMain(options.main);
    }

    let rawResult: WasmCompileOutput;
    try {
      rawResult = await this.backend.compile(toWasmCompileOptions(options));
    } catch (cause) {
      throw new CompileError(extractErrorMessage(cause), { cause });
    }

    if (hasErrorDiagnostics(rawResult.diagnostics) || !rawResult.success) {
      throw new CompileError(rawResult.internal_error ?? "Compilation failed", {
        diagnostics: rawResult.diagnostics,
      });
    }

    return normalizeCompileResult(rawResult);
  }

  dispose(): Promise<void> {
    return this.backend.dispose();
  }
}

export const createTypstCompiler = async (
  options: TypstCompilerOptions,
): Promise<TypstCompiler> => {
  const packageManager = new PackageManager({
    fetch: options.fetch,
    packageBaseUrl: options.packageBaseUrl,
    cache: options.packageCache,
    memoryPackageCacheCapacity: options.memoryPackageCacheCapacity,
  });
  const backend = createCompilerBackend(options.backend ?? "auto", {
    packageManager,
    fetch: options.fetch,
  });

  await backend.init(options.moduleOrPath);
  return new PromiseTypstCompiler(backend);
};

export { SharedMemoryCommunication } from "./protocol";
export type { MainToWorkerMessage, WorkerToMainMessage } from "./messages";
export type { WasmModuleOrPath } from "./wasm-module";
export type { WasmDiagnostic } from "./wasm";
export type {
  BundleFile,
  CompileFormat,
  CompileOptions,
  CompileResult,
  PageOutput,
  PackageCache,
  TypstCompiler,
  TypstCompilerOptions,
} from "./types";
export * from "@typst-wasm/fonts";
export * from "./errors";
export { PackageManager } from "./package-manager";
export {
  makeBrowserCacheStorage,
  makeDefaultPackageCache,
  makeMemoryCacheStorage,
} from "./cache-abstraction";
export {
  supportsWorkerBackend,
  supportsJspiBackend,
  selectAutomaticBackendKind,
} from "./compiler-backend";
