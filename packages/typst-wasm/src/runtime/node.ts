import { Worker } from "node:worker_threads";
import type { TypstRuntime } from "../backends/index";
import {
  supportsJspiBackend,
  supportsWorkerBackend,
} from "../backends/capabilities";
import type { WorkerHost } from "../worker/host";
import { loadDefaultWasmBytes, wasmBinaryUrl } from "./node-loader";
import { loadWasmModule } from "./instantiate";

export { wasmBinaryUrl };
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
  loadWasmBytes: (options) =>
    options.loadWasmBytes?.() ?? loadDefaultWasmBytes(),
  supportsWorkerBackend,
  supportsJspiBackend,
};
