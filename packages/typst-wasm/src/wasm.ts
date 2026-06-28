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

export type WasmCompileOptions = EngineCompileOptions & {
  main?: string;
  root?: string;
};

export type WasmCompileOutput = EngineCompileOutput;

export { wasmBinaryUrl };
export default wasmBinaryUrl;

export const toWasmCompileOptions = (options: CompileOptions = {}): WasmCompileOptions => ({
  format: options.format ?? "pdf",
  main: options.main,
  root: options.root,
  inputs: options.inputs,
  features: options.features,
  creation_timestamp: options.creationTimestamp,
  jobs: options.jobs,
  diagnostic_format: options.diagnosticFormat,
  pages: options.pages,
  pdf_standards: options.pdfStandards,
  pdf_tags: options.pdfTags,
  ppi: options.ppi,
  deps: options.deps,
  deps_format: options.depsFormat,
  timings: options.timings,
});

export const loadWasmModule = (): Promise<WasmModule> => loadEngineWasmModule();
