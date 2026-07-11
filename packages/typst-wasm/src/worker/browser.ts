import * as engine from "@typst-wasm/engine-wasm/worker";
import type { WorkerPort } from "./port";
import { installTypstWorkerRuntime } from "./runtime";

export type { MainToWorkerMessage, WorkerToMainMessage } from "./messages";

type BrowserWorkerScope = {
  onmessage: ((event: MessageEvent) => void) | null;
  postMessage(data: unknown): void;
};

const scope = globalThis as unknown as BrowserWorkerScope;

const browserPort: WorkerPort = {
  onMessage: (handler) => {
    scope.onmessage = (event: MessageEvent) => handler(event.data);
  },
  postMessage: (data) => scope.postMessage(data),
};

installTypstWorkerRuntime(browserPort, async () => engine);
