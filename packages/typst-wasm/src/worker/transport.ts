import { isWorkerToMainMessage, type WorkerToMainMessage } from "./messages";

type WorkerLike = {
  onmessage: ((event: MessageEvent) => void) | null;
  onerror?: ((event: ErrorEvent) => void) | null;
  postMessage: (message: unknown) => void;
};

export type WorkerTransport = {
  readonly post: (message: unknown) => void;
  readonly close: () => void;
};

export const makeWorkerTransport = (
  worker: WorkerLike,
  onMessage: (message: WorkerToMainMessage) => void,
  onError: (cause: unknown) => void,
): WorkerTransport => {
  worker.onmessage = (event: MessageEvent) => {
    if (isWorkerToMainMessage(event.data)) {
      onMessage(event.data);
    }
  };

  if ("onerror" in worker) {
    worker.onerror = (event: ErrorEvent) => {
      onError(event.error ?? event.message);
    };
  }

  return {
    post: (message: unknown) => {
      worker.postMessage(message);
    },
    close: () => {
      worker.onmessage = null;
      if ("onerror" in worker) {
        worker.onerror = null;
      }
    },
  };
};
