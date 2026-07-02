import type { TypstRuntime } from "../backends/index";
import { normalizeAssetUrl } from "../wasm/index";
import TypstWorker from "../worker/node.ts?worker";
import { loadWasmModule, wasmBinaryUrl, wasmGlueUrl } from "./node-loader";

export { loadWasmModule, wasmBinaryUrl, wasmGlueUrl };
export default wasmBinaryUrl;

export const nodeRuntime: TypstRuntime = {
  createWorker: () => new TypstWorker() as Worker,
  loadWasmModule,
  resolveAssets: (options) => ({
    wasmURL: normalizeAssetUrl(options.wasmURL) ?? wasmBinaryUrl.href,
    glueURL: normalizeAssetUrl(options.glueURL) ?? wasmGlueUrl.href,
  }),
};
