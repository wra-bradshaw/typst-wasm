import type { PackageCache } from "../files";
import type { EngineCoreModuleLoader, EngineModule } from "../engine/types";
import type { WorkerHost } from "../worker/host";

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

export type RuntimeAsset<T> = T | (() => T | Promise<T>);

export type TypstWorkerAsset = () => WorkerHost;

export interface TypstCompilerOptions {
  backend?: "auto" | "worker" | "jspi";
  /** JCO-generated engine module used by the JSPI backend. */
  engine?: EngineModule;
  /** Overrides JCO's default core WebAssembly module lookup. */
  getCoreModule?: EngineCoreModuleLoader;
  /** Creates the host used by the worker backend when it is selected. */
  worker?: TypstWorkerAsset;
  fileLoaders?: TypstFileLoader[];
  fetch?: typeof fetch;
  packageBaseUrl?: string;
  packageCache?: PackageCache | false;
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
  diagnostics: TypstDiagnostic[];
  metadata?: TypstDocumentMetadata;
  dependencies?: TypstLoadedFile[];
}

export interface TypstDiagnostic {
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
