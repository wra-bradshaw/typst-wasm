import type { TypstRuntime } from "../backends/index";
import { supportsJspiBackend } from "../backends/capabilities";
import type { WorkerHost } from "../worker/host";

export const createNodeWorkerHost = (workerUrl: string | URL): WorkerHost => {
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

  const { Worker } = process.getBuiltinModule(
    "node:worker_threads",
  ) as typeof import("node:worker_threads");
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
    if (!options.worker) {
      throw new Error("Worker backend requires worker");
    }
    return options.worker();
  },
  supportsWorkerBackend: (options) => Boolean(options.worker),
  supportsJspiBackend,
};
