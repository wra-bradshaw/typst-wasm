export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly __wbindgen_externrefs: WebAssembly.Table;
  readonly __wbindgen_malloc: (size: number, align: number) => number;
  readonly __externref_table_dealloc: (index: number) => void;
  readonly typstcompiler_compile: (compilerPtr: number) => [number, number, number];
}

export interface TypstCompilerInstance {
  readonly __wbg_ptr: number;
  free(): void;
  add_file(path: string, data: Uint8Array): void;
  add_font(data: Uint8Array): string;
  add_source(path: string, text: string): void;
  clear_files(): void;
  compile(): {
    success: boolean;
    svg: string | null;
    diagnostics: Array<{
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
    }>;
    internal_error: string | null;
  };
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
