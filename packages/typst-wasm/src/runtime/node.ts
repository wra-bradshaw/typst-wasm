import { Worker } from "node:worker_threads";
import type { TypstRuntime } from "../backends/index";
import {
  supportsJspiBackend,
  supportsWorkerBackend,
} from "../backends/capabilities";
import { normalizeAssetUrl } from "../wasm/index";
import type { WorkerHost } from "../worker/host";
import { loadWasmModule, wasmBinaryUrl, wasmGlueUrl } from "./node-loader";

export { loadWasmModule, wasmBinaryUrl, wasmGlueUrl };
export default wasmBinaryUrl;

const workerUrl = new URL("./worker/node.js", import.meta.url);

const createNodeWorkerHost = (): WorkerHost => {
  const worker = new Worker(workerUrl, { execArgv: [] });
  return {
    listen: (onMessage, onError) => {
      worker.on("message", onMessage);
      worker.on("error", onError);
    },
    postMessage: (data) => worker.postMessage(data),
    terminate: () => worker.terminate(),
  };
};

export const nodeRuntime: TypstRuntime = {
  createWorker: createNodeWorkerHost,
  loadWasmModule,
  resolveAssets: (options) => ({
    wasmURL: normalizeAssetUrl(options.wasmURL) ?? wasmBinaryUrl.href,
    glueURL: normalizeAssetUrl(options.glueURL) ?? wasmGlueUrl.href,
  }),
  supportsWorkerBackend,
  supportsJspiBackend,
};
