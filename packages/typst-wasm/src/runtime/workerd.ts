import type { TypstRuntime } from "../backends/index";
import { supportsJspiBackend } from "../backends/capabilities";
import { loadWasmModule } from "./instantiate";

export const workerdRuntime: TypstRuntime = {
  createWorker: () => {
    throw new Error("typst-wasm worker backend is not available in workerd");
  },
  loadWasmModule,
  loadWasmBytes: (options) => {
    if (!options.loadWasmBytes) {
      throw new Error("typst-wasm workerd entry requires loadWasmBytes");
    }
    return options.loadWasmBytes();
  },
  supportsWorkerBackend: () => false,
  supportsJspiBackend,
};
