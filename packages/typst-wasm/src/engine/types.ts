import type {
  CompileOptions,
  CompileSuccess,
  CompileFailure,
  CompilePayload,
  CompileFormat,
  Diagnostic,
  DocumentMetadata,
  FetchRequest,
  FetchedFile,
  FileKind,
  LoadedFile,
  PdfStandard,
} from "typst-wasm/engine/types";

export type {
  CompileOptions,
  CompileSuccess,
  CompileFailure,
  CompilePayload,
  CompileFormat,
  Diagnostic,
  DocumentMetadata,
  FetchRequest,
  FetchedFile,
  FileKind,
  LoadedFile,
  PdfStandard,
};

export type EngineFetchRequest = FetchRequest;
export type EngineFetchedFile = FetchedFile;
export type EngineCompileOptions = CompileOptions;
export type EngineCompileSuccess = CompileSuccess;
export type EngineDiagnostic = Diagnostic;
export type EngineLoadedFile = LoadedFile;

export interface EngineHost {
  fetch(request: FetchRequest): FetchedFile | Promise<FetchedFile>;
  today(
    offsetSeconds?: bigint,
  ): { year: number; month: number; day: number } | undefined;
}

export interface EngineImports {
  "typst:engine/host": EngineHost;
}

export interface EngineCompiler {
  addFont(data: Uint8Array): string;
  addFile(path: string, data: Uint8Array): void;
  addSource(path: string, text: string): void;
  setMain(path: string): void;
  removeFile(path: string): boolean;
  clearFiles(): void;
  listFiles(): string[];
  hasFile(path: string): boolean;
  compile(options: CompileOptions): CompileSuccess | Promise<CompileSuccess>;
}

export interface EngineRoot {
  api: {
    Compiler: new () => EngineCompiler;
  };
}

export type EngineCoreModuleLoader = (
  name: string,
) => WebAssembly.Module | Promise<WebAssembly.Module>;

export interface EngineModule {
  instantiate(
    getCoreModule: EngineCoreModuleLoader | undefined,
    imports: EngineImports,
    instantiateCore?: (
      module: WebAssembly.Module,
      imports: WebAssembly.Imports,
    ) => WebAssembly.Instance | Promise<WebAssembly.Instance>,
  ): EngineRoot | Promise<EngineRoot>;
}
