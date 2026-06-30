import type initWasmModule from "@typst-wasm/engine-wasm";
import type {
  BundleFile as WasmBundleFile,
  CompileOptions as EngineCompileOptions,
  CompileOutput as EngineCompileOutput,
  InitOutput,
  PageOutput as WasmPageOutput,
  TypstCompiler,
  WasmDiagnostic,
} from "@typst-wasm/engine-wasm";
import type { CompileOptions } from "./types";

export interface WasmModule {
  default: typeof initWasmModule;
  TypstCompiler: typeof TypstCompiler;
}

export type TypstCompilerInstance = InstanceType<WasmModule["TypstCompiler"]>;

export type { InitOutput, WasmBundleFile, WasmDiagnostic, WasmPageOutput };

export type WasmCompileOptions = EngineCompileOptions;

export type WasmCompileOutput = EngineCompileOutput;

export const wasmBinaryUrl = new URL(
  import.meta.resolve("@typst-wasm/engine-wasm/typst_wasm_bg.wasm"),
);
export default wasmBinaryUrl;

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

export const loadWasmModule = (): Promise<WasmModule> =>
  import("@typst-wasm/engine-wasm");
