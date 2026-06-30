import type { TypstCompiler } from "@typst-wasm/engine-wasm";
import type { InitOutput, WasmModule } from "./wasm";

export type WasmAssetUrls = {
  wasmURL: string;
  glueURL: string;
};

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
  const maybeDeno = globalThis as typeof globalThis & {
    Deno?: { readFile(path: URL): Promise<Uint8Array> };
  };
  if (maybeDeno.Deno?.readFile) {
    return maybeDeno.Deno.readFile(url);
  }

  const maybeBun = globalThis as typeof globalThis & {
    Bun?: { file(path: URL): { arrayBuffer(): Promise<ArrayBuffer> } };
  };
  if (maybeBun.Bun?.file) {
    return new Uint8Array(await maybeBun.Bun.file(url).arrayBuffer());
  }

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

export const loadWasmModule = async (
  assets: WasmAssetUrls,
): Promise<WasmModule> => {
  const glue = (await import(assets.glueURL)) as WasmGlueModule;
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
