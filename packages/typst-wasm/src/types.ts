import type { WasmDiagnostic } from "./wasm";
import type { WasmModuleOrPath } from "./wasm-module";

export type CompileFormat = "pdf" | "png" | "svg" | "html" | "bundle";

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

export type CompileResult =
  | {
      format: "pdf";
      output: Uint8Array;
      diagnostics: WasmDiagnostic[];
    }
  | {
      format: "png";
      pages: PageOutput<Uint8Array>[];
      diagnostics: WasmDiagnostic[];
    }
  | {
      format: "svg";
      pages: PageOutput<string>[];
      diagnostics: WasmDiagnostic[];
    }
  | {
      format: "html";
      output: string;
      diagnostics: WasmDiagnostic[];
    }
  | {
      format: "bundle";
      files: BundleFile[];
      diagnostics: WasmDiagnostic[];
    };

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
