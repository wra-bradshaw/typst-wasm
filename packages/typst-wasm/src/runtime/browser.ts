import type { TypstRuntime } from "../backends/index";
import {
  supportsJspiBackend,
  supportsWorkerBackend as supportsWorkerBackendPrimitive,
} from "../backends/capabilities";
import type { WorkerHost } from "../worker/host";

/** Creates a worker host backed by a browser `Worker`. */
export const createBrowserWorkerHost = (
  workerUrl: string | URL,
): WorkerHost => {
  const worker = new Worker(workerUrl, { type: "module" });
  return {
    listen: (onMessage, onError) => {
      worker.onmessage = (event: MessageEvent) => onMessage(event.data);
      worker.onerror = (event: ErrorEvent) =>
        onError(event.error ?? event.message);
    },
    postMessage: (data) => worker.postMessage(data),
    terminate: () => worker.terminate(),
  };
};

/** Creates the runtime-default worker host for browsers. */
export const createWorkerHost = createBrowserWorkerHost;

const supportsBrowserWorkerBackend = (): boolean =>
  supportsWorkerBackendPrimitive() && typeof Worker !== "undefined";

export const browserRuntime: TypstRuntime = {
  createWorker: (options) => {
    if (!options.worker) {
      throw new Error("Worker backend requires worker");
    }
    return options.worker();
  },
  supportsWorkerBackend: (options) =>
    Boolean(options.worker) && supportsBrowserWorkerBackend(),
  supportsJspiBackend,
};
