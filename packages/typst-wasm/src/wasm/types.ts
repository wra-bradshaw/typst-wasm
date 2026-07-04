import type {
  BundleFile as WasmBundleFile,
  CompileOptions as EngineCompileOptions,
  CompileOutput as EngineCompileOutput,
  PageOutput as WasmPageOutput,
  TypstCompiler,
  WasmDiagnostic,
} from "@typst-wasm/engine-wasm";
import type { CompileOptions, TypstDocumentMetadata } from "../compiler/types";

export type WasmBytes = ArrayBuffer | Uint8Array;

export type WasmModuleSource = WebAssembly.Module;

export interface InitOutput {
  memory: WebAssembly.Memory;
  typstcompiler_compile: (
    compilerPtr: number,
    options: WasmCompileOptions,
  ) => [number, number, number];
  __wbindgen_start(): void;
  __wbindgen_malloc(size: number, align: number): number;
  __wbindgen_externrefs: WebAssembly.Table;
  __externref_table_dealloc(idx: number): void;
}

export interface WasmModule extends InitOutput {
  TypstCompiler: typeof TypstCompiler;
}

export type TypstCompilerInstance = InstanceType<WasmModule["TypstCompiler"]>;

export type { WasmBundleFile, WasmDiagnostic, WasmPageOutput };

export type WasmCompileOptions = EngineCompileOptions;

export type WasmCompileOutput = EngineCompileOutput & {
  metadata?: TypstDocumentMetadata | null;
};

export type WasmModuleLoader = (
  wasmSource: WasmBytes | WasmModuleSource,
) => Promise<WasmModule>;

export const toWasmCompileOptions = (
  options: CompileOptions = {},
): WasmCompileOptions => ({
  format: options.format ?? "pdf",
  main: options.main ?? null,
  inputs: options.inputs ?? null,
  pages: options.pages ?? null,
  pdf_standards: options.pdfStandards ?? null,
  ppi: options.ppi ?? null,
});
