import type { TypstRuntime } from "../backends/index";
import {
  supportsJspiBackend,
  supportsWorkerBackend as supportsWorkerBackendPrimitive,
} from "../backends/capabilities";
import { normalizeAssetUrl } from "../wasm/index";
import type { WorkerHost } from "../worker/host";
import BrowserTypstWorker from "../worker/browser.ts?worker";
import { loadWasmModule } from "./browser-loader";

const inferGlueUrl = (wasmURL: string | undefined): string | undefined =>
  wasmURL?.replace(/\.wasm(?:$|[?#])/, (match) =>
    match.startsWith(".wasm") ? match.replace(".wasm", ".js") : match,
  );

export { loadWasmModule };

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
  resolveAssets: (options) => {
    const wasmURL = normalizeAssetUrl(options.wasmURL);
    const glueURL = normalizeAssetUrl(options.glueURL);

    return {
      wasmURL,
      glueURL: glueURL ?? inferGlueUrl(wasmURL),
    };
  },
  supportsWorkerBackend: supportsBrowserWorkerBackend,
  supportsJspiBackend,
};
