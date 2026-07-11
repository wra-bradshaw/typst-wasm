import type { WorkerHost } from "./host";
import { isWorkerToMainMessage, type WorkerToMainMessage } from "./messages";
import type { ResolvedLogger } from "../logging";

export type WorkerTransport = {
  readonly post: (message: unknown) => void;
  readonly close: () => void;
};

export const makeWorkerTransport = (
  worker: WorkerHost,
  onMessage: (message: WorkerToMainMessage) => void,
  onError: (cause: unknown) => void,
  logger?: ResolvedLogger,
): WorkerTransport => {
  worker.listen(
    (data) => {
      if (isWorkerToMainMessage(data)) {
        logger?.debug("Received message from Typst worker", {
          kind:
            "kind" in (data as object)
              ? (data as { kind?: unknown }).kind
              : undefined,
        });
        onMessage(data);
      } else {
        logger?.error("Received invalid message from Typst worker", data);
      }
    },
    (cause) => {
      onError(cause);
    },
  );

  return {
    post: (message: unknown) => {
      logger?.debug("Sending message to Typst worker", {
        kind:
          typeof message === "object" && message !== null && "kind" in message
            ? (message as { kind?: unknown }).kind
            : undefined,
      });
      worker.postMessage(message);
    },
    close: () => {
      // Listener cleanup is handled by worker.terminate().
    },
  };
};
