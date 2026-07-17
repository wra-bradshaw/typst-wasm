import { createRuntimeBackend, type BackendService } from "../backends/index";
import { CompileError } from "../errors";
import { FileLoaderManager, makeFetchFileLoader } from "../files/loaders";
import { makePackageFileLoader, PackageManager } from "../files/packages";
import { resolveLogger } from "../logging";
import type {
  EngineCompileOptions,
  EngineCompileSuccess,
  EngineDiagnostic,
} from "../engine/types";
import type {
  AnyCompileResult,
  CompileFormat,
  CompileOptions,
  CompileResult,
  DocumentMetadata,
  FontInput,
  TypstCompiler,
  TypstCompilerOptions,
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

const toEngineCompileOptions = (
  options: CompileOptions,
): EngineCompileOptions => ({
  ...options,
  inputs: options.inputs
    ? Object.entries(options.inputs).map(([key, value]) => ({ key, value }))
    : undefined,
});

const normalizeMetadata = (
  metadata: EngineCompileSuccess["metadata"],
): DocumentMetadata | undefined => {
  if (!metadata) return undefined;
  return {
    ...metadata,
    custom: metadata.custom.map((entry) => {
      let value: unknown;
      try {
        value = JSON.parse(entry.valueJson) as unknown;
      } catch {
        value = entry.valueJson;
      }
      return { label: entry.label, value };
    }),
  };
};

const normalizeCompileResult = (
  result: EngineCompileSuccess,
): AnyCompileResult => {
  const base = {
    diagnostics: result.diagnostics,
    dependencies: result.dependencies,
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
      return { ...base, format: "bundle", files: result.output.val };
  }
};

class PromiseTypstCompiler implements TypstCompiler {
  constructor(private readonly backend: BackendService) {}

  addFonts(...fonts: FontInput[]): Promise<void> {
    return this.backend.addFonts(...fonts);
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

  async compile<F extends CompileFormat>(
    options: CompileOptions<F>,
  ): Promise<CompileResult<F>> {
    try {
      const result = await this.backend.compile(
        toEngineCompileOptions(options),
      );
      if (hasErrorDiagnostics(result.diagnostics)) {
        throw new CompileError("Compilation failed", {
          diagnostics: result.diagnostics,
        });
      }
      return normalizeCompileResult(result) as CompileResult<F>;
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

export const createTypstCompiler = async (
  options: TypstCompilerOptions,
): Promise<TypstCompiler> => {
  if (!options.coreModules) {
    throw new Error("typst-wasm requires coreModules");
  }
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
    makePackageFileLoader(packageManager),
    makeFetchFileLoader(options.fetch),
  ]);
  const backend = createRuntimeBackend(
    options.backend ?? "auto",
    { fileLoaderManager, logger },
    options,
  );

  try {
    await backend.init();
  } catch (error) {
    await backend.dispose();
    throw error;
  }
  return new PromiseTypstCompiler(backend);
};
