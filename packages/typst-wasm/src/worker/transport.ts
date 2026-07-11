import type { WorkerHost } from "./host";
import {
  isRpcResponseMessage,
  isWorkerToMainMessage,
  type WorkerEventMessage,
} from "./messages";
import type { RpcResponseMessage } from "./protocol";
import type { ResolvedLogger } from "../logging";

export type WorkerTransport = {
  readonly post: (message: {
    kind: string;
    requestId: number;
    payload?: unknown;
  }) => void;
  readonly close: () => void;
};

export const makeWorkerTransport = (
  worker: WorkerHost,
  onResponse: (message: RpcResponseMessage) => void,
  onEvent: (message: WorkerEventMessage) => void,
  onError: (cause: unknown) => void,
  logger?: ResolvedLogger,
): WorkerTransport => {
  worker.listen((data) => {
    if (!isWorkerToMainMessage(data)) {
      logger?.error("Received invalid message from Typst worker", data);
      return;
    }

    if (isRpcResponseMessage(data)) {
      logger?.debug("Received message from Typst worker", {
        kind: undefined,
      });
      onResponse(data);
    } else {
      logger?.debug("Received message from Typst worker", {
        kind: data.kind,
      });
      onEvent(data);
    }
  }, onError);

  return {
    post: (message) => {
      logger?.debug("Sending message to Typst worker", { kind: message.kind });
      worker.postMessage(message);
    },
    close: () => {
      // Listener cleanup is handled by worker.terminate().
    },
  };
};
