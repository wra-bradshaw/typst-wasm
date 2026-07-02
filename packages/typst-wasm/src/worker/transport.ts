import type { WorkerHost } from "./host";
import { isWorkerToMainMessage, type WorkerToMainMessage } from "./messages";

export type WorkerTransport = {
  readonly post: (message: unknown) => void;
  readonly close: () => void;
};

export const makeWorkerTransport = (
  worker: WorkerHost,
  onMessage: (message: WorkerToMainMessage) => void,
  onError: (cause: unknown) => void,
): WorkerTransport => {
  worker.listen(
    (data) => {
      if (isWorkerToMainMessage(data)) {
        onMessage(data);
      }
    },
    (cause) => {
      onError(cause);
    },
  );

  return {
    post: (message: unknown) => {
      worker.postMessage(message);
    },
    close: () => {
      // Listener cleanup is handled by worker.terminate().
    },
  };
};
