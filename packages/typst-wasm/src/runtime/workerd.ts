import type { TypstRuntime } from "../backends/index";
import { supportsJspiBackend } from "../backends/capabilities";
import type { WorkerHost } from "../worker/host";

const unavailableWorkerMessage = "Worker backend is unavailable in workerd";

/** Throws because worker backends are unavailable in Cloudflare Workers. */
export const createWorkerHost = (_workerUrl: string | URL): WorkerHost => {
  throw new Error(unavailableWorkerMessage);
};

export const workerdRuntime: TypstRuntime = {
  createWorker: () => {
    throw new Error(unavailableWorkerMessage);
  },
  supportsWorkerBackend: () => false,
  supportsJspiBackend,
  unavailableWorkerMessage,
};
