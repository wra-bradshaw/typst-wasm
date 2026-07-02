import { loadWasmModule } from "../runtime/browser-loader";
import { installTypstWorkerRuntime } from "./runtime";

export type { MainToWorkerMessage, WorkerToMainMessage } from "./messages";

installTypstWorkerRuntime(loadWasmModule);
