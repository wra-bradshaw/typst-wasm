export type CompileFormat = "pdf" | "png" | "svg" | "html" | "bundle";

export interface CompileOptions {
  format?: CompileFormat;
  main?: string;
  root?: string;
  inputs?: Record<string, string>;
  features?: string[];
  creation_timestamp?: number | null;
  jobs?: number;
  diagnostic_format?: string;
  pages?: string;
  pdf_standards?: string[];
  pdf_tags?: boolean;
  ppi?: number;
  deps?: boolean;
  deps_format?: string;
  timings?: boolean;
}

export interface WasmDiagnostic {
  message: string;
  severity: string;
  file: string | null;
  line: number | null;
  column: number | null;
  start: number | null;
  end: number | null;
  formatted: string;
  hints: string[];
  trace: string[];
}

export interface PageOutput {
  page: number;
  output_text?: string | null;
  output_bytes?: Uint8Array | null;
}

export interface BundleFile {
  path: string;
  data: Uint8Array;
  media_type?: string | null;
}

export interface CompileOutput {
  success: boolean;
  format: CompileFormat;
  output_text?: string | null;
  output_bytes?: Uint8Array | null;
  pages: PageOutput[];
  files: BundleFile[];
  diagnostics: WasmDiagnostic[];
  internal_error: string | null;
  deps?: { files: string[] } | null;
  timings?: string | null;
}

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly __wbindgen_externrefs: WebAssembly.Table;
  readonly __wbindgen_malloc: (size: number, align: number) => number;
  readonly __externref_table_dealloc: (index: number) => void;
  readonly typstcompiler_compile: (compilerPtr: number, options: CompileOptions) => [number, number, number];
}

export interface TypstCompilerInstance {
  readonly __wbg_ptr: number;
  free(): void;
  add_file(path: string, data: Uint8Array): void;
  add_font(data: Uint8Array): string;
  add_source(path: string, text: string): void;
  clear_files(): void;
  compile(options: CompileOptions): CompileOutput;
  has_file(path: string): boolean;
  list_files(): string[];
  remove_file(path: string): void;
  set_main(path: string): void;
}

export interface WasmModule {
  default: (moduleOrPath?: unknown, memory?: WebAssembly.Memory) => Promise<InitOutput>;
  TypstCompiler: new () => TypstCompilerInstance;
}

export declare const wasmBinaryUrl: URL;
export declare const loadWasmModule: () => Promise<WasmModule>;
