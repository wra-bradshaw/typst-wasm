import {
  createRuntimeBackend,
  type BackendService,
  type TypstRuntime,
} from "../backends/index";
import { CompileError } from "../errors";
import { FetchFileLoader, FileLoaderManager } from "../files/loaders";
import { PackageFileLoader, PackageManager } from "../files/packages";
import { toWasmCompileOptions, type WasmCompileOutput } from "../wasm/index";
import type {
  CompileOptions,
  CompileResult,
  TypstCompiler,
  TypstCompilerOptions,
  TypstDocumentMetadata,
  TypstLoadedFile,
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

const normalizeMetadata = (
  metadata: WasmCompileOutput["metadata"],
): TypstDocumentMetadata | undefined => {
  if (!metadata) return undefined;

  return {
    title: metadata.title ?? undefined,
    description: metadata.description ?? undefined,
    author: metadata.author,
    keywords: metadata.keywords,
    custom: metadata.custom.map((entry) => ({
      label: entry.label ?? undefined,
      value: entry.value,
    })),
  };
};

const normalizeCompileResult = (
  result: WasmCompileOutput,
  dependencies: TypstLoadedFile[],
): CompileResult => {
  const diagnostics = result.diagnostics;
  const base = {
    diagnostics,
    dependencies,
    metadata: normalizeMetadata(result.metadata),
  };

  switch (result.format) {
    case "pdf":
      return {
        ...base,
        format: "pdf",
        output: result.output_bytes ?? new Uint8Array(),
      };
    case "png":
      return {
        ...base,
        format: "png",
        pages: result.pages.map((page) => ({
          page: page.page,
          output: page.output_bytes ?? new Uint8Array(),
        })),
      };
    case "svg":
      return {
        ...base,
        format: "svg",
        pages: result.pages.map((page) => ({
          page: page.page,
          output: page.output_text ?? "",
        })),
      };
    case "html":
      return {
        ...base,
        format: "html",
        output: result.output_text ?? "",
      };
    case "bundle":
      return {
        ...base,
        format: "bundle",
        files: result.files.map((file) => ({
          path: file.path,
          data: file.data,
          mediaType: file.media_type ?? undefined,
        })),
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
  constructor(
    private readonly backend: BackendService,
    private readonly fileLoaderManager: FileLoaderManager,
  ) {}

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
    this.fileLoaderManager.resetTrace();
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

    return normalizeCompileResult(rawResult, this.fileLoaderManager.getTrace());
  }

  dispose(): Promise<void> {
    return this.backend.dispose();
  }
}

export const createTypstCompilerWithRuntime = async (
  options: TypstCompilerOptions,
  runtime: TypstRuntime,
): Promise<TypstCompiler> => {
  const packageManager = new PackageManager({
    fetch: options.fetch,
    packageBaseUrl: options.packageBaseUrl,
    cache: options.packageCache,
    memoryPackageCacheCapacity: options.memoryPackageCacheCapacity,
  });
  const fileLoaderManager = new FileLoaderManager([
    ...(options.fileLoaders ?? []),
    new PackageFileLoader(packageManager),
    new FetchFileLoader(options.fetch),
  ]);
  const backend = createRuntimeBackend(
    options.backend ?? "auto",
    {
      fileLoaderManager,
    },
    runtime,
  );

  await backend.init(runtime.resolveAssets(options));
  return new PromiseTypstCompiler(backend, fileLoaderManager);
};
