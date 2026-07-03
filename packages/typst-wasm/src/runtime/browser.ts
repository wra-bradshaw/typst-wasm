import type { TypstRuntime } from "../backends/index";
import {
  supportsJspiBackend,
  supportsWorkerBackend as supportsWorkerBackendPrimitive,
} from "../backends/capabilities";
import type { WorkerHost } from "../worker/host";
import BrowserTypstWorker from "../worker/browser.ts?worker";
import { loadWasmModule } from "./instantiate";

const createBrowserWorkerHost = (): WorkerHost => {
  const worker = new BrowserTypstWorker();
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

const supportsBrowserWorkerBackend = (): boolean =>
  supportsWorkerBackendPrimitive() && typeof Worker !== "undefined";

export const browserRuntime: TypstRuntime = {
  createWorker: createBrowserWorkerHost,
  loadWasmModule,
  loadWasmBytes: (options) => {
    if (!options.loadWasmBytes) {
      throw new Error("typst-wasm browser entry requires loadWasmBytes");
    }
    return options.loadWasmBytes();
  },
  supportsWorkerBackend: supportsBrowserWorkerBackend,
  supportsJspiBackend,
};
