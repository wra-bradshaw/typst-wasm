import type { WasmModuleOrPath } from "./wasm-module";

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

export interface CompileOutput {
  success: boolean;
  svg: string | null;
  diagnostics: WasmDiagnostic[];
  internal_error: string | null;
}

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
  compile(): CompileOutput;
  has_file(path: string): boolean;
  list_files(): string[];
  remove_file(path: string): void;
  set_main(path: string): void;
}

type WasmInitArgument =
  | {
      module_or_path: WasmModuleOrPath | Promise<WasmModuleOrPath>;
      memory?: WebAssembly.Memory;
      imports?: Record<string, unknown>;
      thread_stack_size?: number;
    }
  | WasmModuleOrPath
  | Promise<WasmModuleOrPath>;

type WasmModule = {
  default: (moduleOrPath?: WasmInitArgument, memory?: WebAssembly.Memory) => Promise<InitOutput>;
  TypstCompiler: new () => TypstCompilerInstance;
};

export const loadWasmModule = (): Promise<WasmModule> =>
  import("./wasm/typst_wasm.js") as Promise<WasmModule>;
