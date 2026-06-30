import type {
  BundleFile as WasmBundleFile,
  CompileOptions as EngineCompileOptions,
  CompileOutput as EngineCompileOutput,
  PageOutput as WasmPageOutput,
  TypstCompiler,
  WasmDiagnostic,
} from "@typst-wasm/engine-wasm";
import type { CompileOptions, TypstDocumentMetadata } from "./types";

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

export const wasmBinaryUrl = new URL(
  import.meta.resolve("@typst-wasm/engine-wasm/typst_wasm_bg.wasm"),
);
export default wasmBinaryUrl;

export const wasmGlueUrl = new URL(
  import.meta
    .resolve("@typst-wasm/engine-wasm/typst_wasm_bg.wasm")
    .replace(/\.wasm$/, ".js"),
);

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
