export type EngineFileKind = "project" | "package" | "url";

export interface EngineFetchRequest {
  path: string;
  kind: EngineFileKind;
}

export interface EngineFetchedFile {
  data: Uint8Array;
  resolvedPath?: string;
  mediaType?: string;
}

export type EngineFetchError =
  | { tag: "not-found" }
  | { tag: "denied" }
  | { tag: "timeout" }
  | { tag: "unavailable" }
  | { tag: "other"; val: string };

export interface EngineHost {
  fetch(
    request: EngineFetchRequest,
  ): EngineFetchedFile | Promise<EngineFetchedFile>;
  today(
    offsetSeconds?: bigint,
  ): { year: number; month: number; day: number } | undefined;
}

export interface EngineImports {
  "typst:engine/host": EngineHost;
}

export interface EngineCompileOptions {
  format?: "pdf" | "png" | "svg" | "html" | "bundle";
  main?: string;
  inputs?: Array<{ key: string; value: string }>;
  pages?: string;
  pdfStandards?: Array<"v17" | "a2b" | "a3b">;
  ppi?: number;
}

export interface EngineDiagnostic {
  message: string;
  severity: "warning" | "error";
  file?: string;
  line?: number;
  column?: number;
  start?: number;
  end?: number;
  formatted: string;
  hints: string[];
  trace: string[];
}

export interface EngineLoadedFile {
  kind: EngineFileKind;
  path: string;
  resolvedPath?: string;
  mediaType?: string;
}

export interface EngineDocumentMetadata {
  title?: string;
  description?: string;
  author: string[];
  keywords: string[];
  custom: Array<{ label?: string; valueJson: string }>;
}

export type EngineCompilePayload =
  | { tag: "pdf"; val: Uint8Array }
  | { tag: "png"; val: Array<{ page: number; data: Uint8Array }> }
  | { tag: "svg"; val: Array<{ page: number; data: string }> }
  | { tag: "html"; val: string }
  | {
      tag: "bundle";
      val: Array<{ path: string; data: Uint8Array; mediaType?: string }>;
    };

export interface EngineCompileSuccess {
  output: EngineCompilePayload;
  diagnostics: EngineDiagnostic[];
  metadata?: EngineDocumentMetadata;
  dependencies: EngineLoadedFile[];
}

export interface EngineCompileFailure {
  diagnostics: EngineDiagnostic[];
  dependencies: EngineLoadedFile[];
  message?: string;
}

export type EngineOperationError =
  | { tag: "invalid-path"; val: string }
  | { tag: "font-parse-failed" }
  | { tag: "other"; val: string };

export interface EngineCompiler {
  addFont(data: Uint8Array): string;
  addFile(path: string, data: Uint8Array): void;
  addSource(path: string, text: string): void;
  setMain(path: string): void;
  removeFile(path: string): boolean;
  clearFiles(): void;
  listFiles(): string[];
  hasFile(path: string): boolean;
  compile(
    options: EngineCompileOptions,
  ): EngineCompileSuccess | Promise<EngineCompileSuccess>;
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
