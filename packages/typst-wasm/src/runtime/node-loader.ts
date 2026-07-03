import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import type { WasmBytes } from "../wasm/index";

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

const loadWasmBytesFromUrl = async (
  wasmSource: string,
): Promise<ArrayBuffer> => {
  const parsed = parseAbsoluteUrl(wasmSource);
  if (parsed?.protocol === "file:") {
    return bytesToArrayBuffer(await readFileUrl(parsed));
  }

  return fetchBytes(parsed ?? wasmSource);
};

const require = createRequire(import.meta.url);

export const wasmBinaryUrl = pathToFileURL(
  require.resolve("@typst-wasm/engine-wasm/typst_wasm_bg.wasm"),
);
export default wasmBinaryUrl;

export const loadDefaultWasmBytes = (): Promise<WasmBytes> =>
  loadWasmBytesFromUrl(wasmBinaryUrl.href);
