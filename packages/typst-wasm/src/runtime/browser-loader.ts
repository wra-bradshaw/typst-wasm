import type { TypstCompiler } from "@typst-wasm/engine-wasm";
import initWasm from "@typst-wasm/engine-wasm/typst_wasm_bg.wasm?init";
import * as glue from "@typst-wasm/engine-wasm/typst_wasm_bg.js";
import type { InitOutput, WasmAssetUrls, WasmModule } from "../wasm/index";

type WasmGlueModule = {
  TypstCompiler: typeof TypstCompiler;
  __wbg_set_wasm(wasm: WebAssembly.Exports): void;
};

let bundlerModule: WasmModule | undefined;

const hasExplicitUrls = (assets: WasmAssetUrls): boolean =>
  Boolean(assets.wasmURL || assets.glueURL);

const loadBrowserUrlWasmModule = async (
  assets: WasmAssetUrls,
): Promise<WasmModule> => {
  if (!assets.wasmURL || !assets.glueURL) {
    throw new Error("WASM URL loader requires both wasmURL and glueURL");
  }

  const glueModule = (await import(
    /* @vite-ignore */ assets.glueURL
  )) as WasmGlueModule;
  const response = await fetch(assets.wasmURL);
  if (!response.ok) {
    throw new Error(`Failed to fetch WASM module: ${response.status}`);
  }

  const instance = (
    await WebAssembly.instantiate(await response.arrayBuffer(), {
      "./typst_wasm_bg.js": glueModule,
    })
  ).instance;
  const wasmExports = instance.exports as unknown as InitOutput;

  glueModule.__wbg_set_wasm(instance.exports);
  wasmExports.__wbindgen_start();

  return {
    ...wasmExports,
    TypstCompiler: glueModule.TypstCompiler,
  };
};

export const loadWasmModule = async (
  assets: WasmAssetUrls = {},
): Promise<WasmModule> => {
  if (hasExplicitUrls(assets)) {
    return loadBrowserUrlWasmModule(assets);
  }

  if (!bundlerModule) {
    const glueModule = glue as unknown as WasmGlueModule;
    const wasmExports = (await initWasm({ "./typst_wasm_bg.js": glueModule }))
      .exports as unknown as InitOutput;

    glueModule.__wbg_set_wasm(wasmExports as unknown as WebAssembly.Exports);
    wasmExports.__wbindgen_start();
    bundlerModule = {
      ...wasmExports,
      TypstCompiler: glueModule.TypstCompiler,
    };
  }

  return bundlerModule;
};
