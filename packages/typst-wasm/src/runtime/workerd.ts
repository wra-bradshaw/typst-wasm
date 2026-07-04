import type { TypstRuntime } from "../backends/index";
import { supportsJspiBackend } from "../backends/capabilities";
import type { WorkerHost } from "../worker/host";
import { loadWasmModule } from "./instantiate";

const unavailableWorkerMessage = "Worker backend is unavailable in workerd";

export const createWorkerHost = (_workerUrl: string | URL): WorkerHost => {
  throw new Error(unavailableWorkerMessage);
};

export const workerdRuntime: TypstRuntime = {
  createWorker: () => {
    throw new Error(unavailableWorkerMessage);
  },
  loadWasmModule,
  loadWasmSource: (options) =>
    typeof options.assets.wasm === "function"
      ? options.assets.wasm()
      : options.assets.wasm,
  supportsWorkerBackend: () => false,
  supportsJspiBackend,
  unavailableWorkerMessage,
};
