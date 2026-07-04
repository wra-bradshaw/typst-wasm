import { Worker } from "node:worker_threads";
import type { TypstRuntime } from "../backends/index";
import { supportsJspiBackend } from "../backends/capabilities";
import type { WorkerHost } from "../worker/host";
import { loadWasmModule } from "./instantiate";

export const createNodeWorkerHost = (workerUrl: string | URL): WorkerHost => {
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

export const createWorkerHost = createNodeWorkerHost;

export const nodeRuntime: TypstRuntime = {
  createWorker: (options) => {
    if (!options.assets.worker) {
      throw new Error("Worker backend requires assets.worker");
    }
    return options.assets.worker();
  },
  loadWasmModule,
  loadWasmSource: (options) =>
    typeof options.assets.wasm === "function"
      ? options.assets.wasm()
      : options.assets.wasm,
  supportsWorkerBackend: (options) => Boolean(options.assets.worker),
  supportsJspiBackend,
};
