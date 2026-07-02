import { loadWasmModule } from "../runtime/node-loader";
import { installTypstWorkerRuntime } from "./runtime";

export type { MainToWorkerMessage, WorkerToMainMessage } from "./messages";

installTypstWorkerRuntime(loadWasmModule);
