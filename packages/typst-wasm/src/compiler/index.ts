import {
  createRuntimeBackend,
  type BackendService,
  type TypstRuntime,
} from "../backends/index";
import { CompileError } from "../errors";
import { FetchFileLoader, FileLoaderManager } from "../files/loaders";
import { PackageFileLoader, PackageManager } from "../files/packages";
import { resolveLogger } from "../logging";
import type {
  EngineCompileOptions,
  EngineCompileSuccess,
  EngineDiagnostic,
} from "../engine/types";
import type {
  CompileFormat,
  CompileOptions,
  CompileResult,
  CompileResultForFormat,
  TypstCompiler,
  TypstCompilerOptions,
  TypstDocumentMetadata,
  TypstLoadedFile,
} from "./types";

const hasErrorDiagnostics = (diagnostics: EngineDiagnostic[]): boolean =>
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

const extractErrorPayload = (error: unknown): unknown => {
  if (typeof error !== "object" || error === null) return undefined;
  if ("payload" in error) return (error as { payload?: unknown }).payload;
  if ("cause" in error) {
    return extractErrorPayload((error as { cause?: unknown }).cause);
  }
  return undefined;
};

const normalizeMetadata = (
  metadata: EngineCompileSuccess["metadata"],
): TypstDocumentMetadata | undefined => {
  if (!metadata) return undefined;

  return {
    title: metadata.title,
    description: metadata.description,
    author: metadata.author,
    keywords: metadata.keywords,
    custom: metadata.custom.map((entry) => {
      let value: unknown = entry.valueJson;
      try {
        value = JSON.parse(entry.valueJson);
      } catch {
        // Keep malformed custom metadata as its original string value.
      }
      return { label: entry.label, value };
    }),
  };
};

const normalizeDependencies = (
  dependencies: EngineCompileSuccess["dependencies"],
): TypstLoadedFile[] => dependencies;

const normalizeCompileResult = (
  result: EngineCompileSuccess,
): CompileResult => {
  const base = {
    diagnostics: result.diagnostics,
    dependencies: normalizeDependencies(result.dependencies),
    metadata: normalizeMetadata(result.metadata),
  };

  switch (result.output.tag) {
    case "pdf":
      return { ...base, format: "pdf", output: result.output.val };
    case "png":
      return {
        ...base,
        format: "png",
        pages: result.output.val.map((page) => ({
          page: page.page,
          output: page.data,
        })),
      };
    case "svg":
      return {
        ...base,
        format: "svg",
        pages: result.output.val.map((page) => ({
          page: page.page,
          output: page.data,
        })),
      };
    case "html":
      return { ...base, format: "html", output: result.output.val };
    case "bundle":
      return {
        ...base,
        format: "bundle",
        files: result.output.val.map((file) => ({
          path: file.path,
          data: file.data,
          mediaType: file.mediaType,
        })),
      };
  }
};

const toEngineCompileOptions = (
  options: CompileOptions = {},
): EngineCompileOptions => ({
  format: options.format,
  main: options.main,
  inputs: options.inputs
    ? Object.entries(options.inputs).map(([key, value]) => ({ key, value }))
    : undefined,
  pages: options.pages,
  pdfStandards: options.pdfStandards as EngineCompileOptions["pdfStandards"],
  ppi: options.ppi,
});

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

  compile<F extends CompileFormat>(
    options: CompileOptions & { format: F },
  ): Promise<CompileResultForFormat<F>>;
  compile(options?: CompileOptions): Promise<CompileResult>;
  async compile(options: CompileOptions = {}): Promise<CompileResult> {
    if (options.main) await this.setMain(options.main);
    this.fileLoaderManager.resetTrace();

    try {
      const result = await this.backend.compile(
        toEngineCompileOptions(options),
      );
      if (hasErrorDiagnostics(result.diagnostics)) {
        throw new CompileError("Compilation failed", {
          diagnostics: result.diagnostics,
        });
      }
      return normalizeCompileResult(result);
    } catch (cause) {
      const payload = extractErrorPayload(cause) ?? cause;
      if (
        typeof payload === "object" &&
        payload !== null &&
        "diagnostics" in payload
      ) {
        const failure = payload as {
          diagnostics: EngineDiagnostic[];
          message?: string;
        };
        throw new CompileError(failure.message ?? "Compilation failed", {
          diagnostics: failure.diagnostics,
          cause,
        });
      }
      if (cause instanceof CompileError) throw cause;
      throw new CompileError(extractErrorMessage(cause), { cause });
    }
  }

  dispose(): Promise<void> {
    return this.backend.dispose();
  }
}

export const createTypstCompilerWithRuntime = async (
  options: TypstCompilerOptions,
  runtime: TypstRuntime,
): Promise<TypstCompiler> => {
  const logger = resolveLogger(options.logger, options.logLevel);
  const packageManager = new PackageManager({
    fetch: options.fetch,
    logger,
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
    { fileLoaderManager, logger },
    runtime,
    options,
  );

  await backend.init();
  return new PromiseTypstCompiler(backend, fileLoaderManager);
};
