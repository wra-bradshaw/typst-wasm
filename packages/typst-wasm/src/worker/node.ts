import { parentPort } from "node:worker_threads";
import { loadWasmModule } from "../runtime/instantiate";
import type { WorkerPort } from "./port";
import { installTypstWorkerRuntime } from "./runtime";

export type { MainToWorkerMessage, WorkerToMainMessage } from "./messages";

if (!parentPort) {
  throw new Error("worker/node.ts must run inside a worker_threads Worker");
}

const port = parentPort;

const nodePort: WorkerPort = {
  onMessage: (handler) => {
    port.on("message", handler);
  },
  postMessage: (data) => port.postMessage(data),
};

installTypstWorkerRuntime(nodePort, loadWasmModule);
