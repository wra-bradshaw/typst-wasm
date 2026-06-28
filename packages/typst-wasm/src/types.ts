import type { WasmDiagnostic } from "./wasm";
import type { WasmModuleOrPath } from "./wasm-module";

export type CompileFormat = "pdf" | "png" | "svg" | "html" | "bundle";

export type DiagnosticFormat = "human" | "short";

export interface TypstCompilerOptions {
  moduleOrPath: WasmModuleOrPath;
  backend?: "auto" | "worker" | "jspi";
  fetch?: typeof fetch;
  packageBaseUrl?: string;
  packageCache?: PackageCache;
  memoryPackageCacheCapacity?: number;
}

export interface CompileOptions {
  format?: CompileFormat;
  main?: string;
  root?: string;
  inputs?: Record<string, string>;
  features?: string[];
  creationTimestamp?: number | null;
  jobs?: number;
  diagnosticFormat?: DiagnosticFormat;
  pages?: string;
  pdfStandards?: string[];
  pdfTags?: boolean;
  ppi?: number;
  deps?: boolean;
  depsFormat?: "json";
  timings?: boolean;
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

export interface DependencyInfo {
  files: string[];
}

export type CompileResult =
  | { format: "pdf"; output: Uint8Array; diagnostics: WasmDiagnostic[]; deps?: DependencyInfo; timings?: unknown }
  | { format: "png"; pages: PageOutput<Uint8Array>[]; diagnostics: WasmDiagnostic[]; deps?: DependencyInfo; timings?: unknown }
  | { format: "svg"; pages: PageOutput<string>[]; diagnostics: WasmDiagnostic[]; deps?: DependencyInfo; timings?: unknown }
  | { format: "html"; output: string; diagnostics: WasmDiagnostic[]; deps?: DependencyInfo; timings?: unknown }
  | { format: "bundle"; files: BundleFile[]; diagnostics: WasmDiagnostic[]; deps?: DependencyInfo; timings?: unknown };

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
