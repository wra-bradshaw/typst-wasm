import type { Worker as NodeWorker } from "node:worker_threads";
import type { TypstRuntime } from "../backends/index";
import {
  supportsJspiBackend,
  supportsWorkerBackend as supportsWorkerBackendPrimitive,
} from "../backends/capabilities";
import type { WorkerHost } from "../worker/host";

/** Creates a worker host backed by a Node.js or Bun worker. */
export const createWorkerThread = (workerUrl: string | URL): WorkerHost => {
  if ("Bun" in globalThis) {
    const worker = new globalThis.Worker(workerUrl, { type: "module" });
    return {
      listen: (onMessage, onError) => {
        worker.addEventListener("message", (event) => onMessage(event.data));
        worker.addEventListener("error", onError);
      },
      postMessage: (data) => worker.postMessage(data),
      terminate: () => worker.terminate(),
    };
  }

  const { Worker } = process.getBuiltinModule("node:worker_threads") as {
    Worker: typeof NodeWorker;
  };
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
  createWorker: (options) => {
    if (!options.worker) {
      throw new Error("Worker backend requires worker");
    }
    return options.worker();
  },
  supportsWorkerBackend: (options) =>
    Boolean(options.worker) && supportsWorkerBackendPrimitive(),
  supportsJspiBackend,
};
