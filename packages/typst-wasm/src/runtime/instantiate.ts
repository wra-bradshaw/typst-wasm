import type { TypstCompiler } from "@typst-wasm/engine-wasm";
import * as glue from "@typst-wasm/engine-wasm/typst_wasm_bg.js";
import type {
  InitOutput,
  WasmBytes,
  WasmModule,
  WasmModuleSource,
} from "../wasm/index";

type WasmGlueModule = {
  TypstCompiler: typeof TypstCompiler;
  __wbg_set_wasm(wasm: WebAssembly.Exports): void;
} & WebAssembly.Imports[string];

const instantiateWasm = async (
  wasm: WasmBytes | WasmModuleSource,
  imports: WebAssembly.Imports,
): Promise<WebAssembly.Instance> => {
  if (wasm instanceof WebAssembly.Module) {
    return WebAssembly.instantiate(wasm, imports);
  }

  return (await WebAssembly.instantiate(wasm, imports)).instance;
};

export const loadWasmModule = async (
  wasm: WasmBytes | WasmModuleSource,
): Promise<WasmModule> => {
  const glueModule = glue as unknown as WasmGlueModule;
  const instance = await instantiateWasm(wasm, {
    "./typst_wasm_bg.js": glueModule,
  });
  const wasmExports = instance.exports as unknown as InitOutput;

  glueModule.__wbg_set_wasm(instance.exports);
  wasmExports.__wbindgen_start();

  return {
    ...wasmExports,
    TypstCompiler: glueModule.TypstCompiler,
  };
};
