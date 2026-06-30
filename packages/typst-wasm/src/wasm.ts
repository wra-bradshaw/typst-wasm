import {
  loadWasmModule as loadEngineWasmModule,
  wasmBinaryUrl,
  type BundleFile as WasmBundleFile,
  type CompileOptions as EngineCompileOptions,
  type CompileOutput as EngineCompileOutput,
  type InitOutput,
  type PageOutput as WasmPageOutput,
  type TypstCompilerInstance,
  type WasmDiagnostic,
  type WasmModule,
} from "@typst-wasm/engine-wasm";
import type { CompileOptions } from "./types";

export type {
  InitOutput,
  TypstCompilerInstance,
  WasmBundleFile,
  WasmDiagnostic,
  WasmPageOutput,
  WasmModule,
};

export type WasmCompileOptions = EngineCompileOptions;

export type WasmCompileOutput = EngineCompileOutput;

export { wasmBinaryUrl };
export default wasmBinaryUrl;

export const toWasmCompileOptions = (
  options: CompileOptions = {},
): WasmCompileOptions => ({
  format: options.format ?? "pdf",
  main: options.main,
  inputs: options.inputs,
  pages: options.pages,
  pdf_standards: options.pdfStandards,
  ppi: options.ppi,
});

export const loadWasmModule = (): Promise<WasmModule> => loadEngineWasmModule();
