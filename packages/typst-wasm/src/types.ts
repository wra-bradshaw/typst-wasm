import type { WasmDiagnostic } from "./wasm";

export type CompileFormat = "pdf" | "png" | "svg" | "html" | "bundle";
export type TypstFileKind = "project" | "package" | "url";

export interface TypstFileRequest {
  path: string;
  kind: TypstFileKind;
}

export interface TypstFileLoad {
  data: Uint8Array;
  resolvedPath?: string;
  mediaType?: string;
}

export type TypstFileLoaderResult =
  | TypstFileLoad
  | Uint8Array
  | null
  | undefined;

export interface TypstFileLoader {
  load(request: TypstFileRequest): Promise<TypstFileLoaderResult>;
}

export interface TypstLoadedFile {
  path: string;
  kind: TypstFileKind;
  resolvedPath?: string;
  mediaType?: string;
}

export interface TypstCustomMetadata {
  label?: string;
  value: unknown;
}

export interface TypstDocumentMetadata {
  title?: string;
  description?: string;
  author: string[];
  keywords: string[];
  custom: TypstCustomMetadata[];
}

export interface TypstCompilerOptions {
  wasmURL?: string | URL;
  glueURL?: string | URL;
  backend?: "auto" | "worker" | "jspi";
  fileLoaders?: TypstFileLoader[];
  fetch?: typeof fetch;
  packageBaseUrl?: string;
  packageCache?: PackageCache;
  memoryPackageCacheCapacity?: number;
}

export interface CompileOptions {
  format?: CompileFormat;
  main?: string;
  inputs?: Record<string, string>;
  pages?: string;
  pdfStandards?: string[];
  ppi?: number;
}

export interface PageOutput<T> {
  page: number;
  output: T;
}

export interface BundleFile {
  path: string;
  data: Uint8Array;
  mediaType?: string;
}

export interface CompileResultBase {
  diagnostics: WasmDiagnostic[];
  metadata?: TypstDocumentMetadata;
  dependencies?: TypstLoadedFile[];
}

export type CompileResult =
  | (CompileResultBase & {
      format: "pdf";
      output: Uint8Array;
    })
  | (CompileResultBase & {
      format: "png";
      pages: PageOutput<Uint8Array>[];
    })
  | (CompileResultBase & {
      format: "svg";
      pages: PageOutput<string>[];
    })
  | (CompileResultBase & {
      format: "html";
      output: string;
    })
  | (CompileResultBase & {
      format: "bundle";
      files: BundleFile[];
    });

export interface PackageCache {
  get(key: string): Promise<Uint8Array | null>;
  set(key: string, value: Uint8Array): Promise<void>;
}

export interface TypstCompiler {
  addFont(data: Uint8Array): Promise<void>;
  addFile(path: string, data: Uint8Array): Promise<void>;
  addSource(path: string, text: string): Promise<void>;
  removeFile(path: string): Promise<void>;
  clearFiles(): Promise<void>;
  listFiles(): Promise<string[]>;
  hasFile(path: string): Promise<boolean>;
  setMain(path: string): Promise<void>;
  compile(options?: CompileOptions): Promise<CompileResult>;
  dispose(): Promise<void>;
}
