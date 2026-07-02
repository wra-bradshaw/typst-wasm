import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import type { TypstCompiler } from "@typst-wasm/engine-wasm";
import type { InitOutput, WasmAssetUrls, WasmModule } from "../wasm/index";

type WasmGlueModule = {
  TypstCompiler: typeof TypstCompiler;
  __wbg_set_wasm(wasm: WebAssembly.Exports): void;
} & WebAssembly.Imports[string];

const bytesToArrayBuffer = (bytes: Uint8Array): ArrayBuffer =>
  bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;

const parseAbsoluteUrl = (source: string): URL | null => {
  try {
    return new URL(source);
  } catch {
    return null;
  }
};

const readFileUrl = async (url: URL): Promise<Uint8Array> => {
  const { readFile } = await import("node:fs/promises");
  return readFile(url);
};

const fetchBytes = async (url: string | URL): Promise<ArrayBuffer> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch WASM module: ${response.status}`);
  }
  return response.arrayBuffer();
};

const loadWasmBytes = async (wasmURL: string): Promise<ArrayBuffer> => {
  const parsed = parseAbsoluteUrl(wasmURL);
  if (parsed?.protocol === "file:") {
    return bytesToArrayBuffer(await readFileUrl(parsed));
  }

  return fetchBytes(parsed ?? wasmURL);
};

const require = createRequire(import.meta.url);

export const wasmBinaryUrl = pathToFileURL(
  require.resolve("@typst-wasm/engine-wasm/typst_wasm_bg.wasm"),
);
export default wasmBinaryUrl;

export const wasmGlueUrl = pathToFileURL(
  require.resolve("@typst-wasm/engine-wasm/typst_wasm_bg.js"),
);

export const loadWasmModule = async (
  assets: WasmAssetUrls,
): Promise<WasmModule> => {
  if (!assets.wasmURL || !assets.glueURL) {
    throw new Error("WASM URL loader requires both wasmURL and glueURL");
  }

  const glue = (await import(
    /* @vite-ignore */ assets.glueURL
  )) as WasmGlueModule;
  const instance = (
    await WebAssembly.instantiate(await loadWasmBytes(assets.wasmURL), {
      "./typst_wasm_bg.js": glue,
    })
  ).instance;
  const exports = instance.exports as unknown as InitOutput;

  glue.__wbg_set_wasm(instance.exports);
  exports.__wbindgen_start();

  return {
    ...exports,
    TypstCompiler: glue.TypstCompiler,
  };
};
