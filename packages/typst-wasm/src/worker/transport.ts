import type { WorkerHost } from "./host";
import {
  isRpcResponseMessage,
  isWorkerEventMessage,
  type WorkerEventMessage,
  type MainToWorkerMessage,
} from "./messages";
import type { RpcResponseMessage } from "./protocol";
import type { ResolvedLogger } from "../logging";

export type WorkerTransport = {
  readonly post: (message: MainToWorkerMessage) => void;
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
    if (isRpcResponseMessage(data)) {
      logger?.debug("Received message from Typst worker", { kind: undefined });
      onResponse(data);
    } else if (isWorkerEventMessage(data)) {
      logger?.debug("Received message from Typst worker", { kind: data.kind });
      onEvent(data);
    } else {
      logger?.error("Received invalid message from Typst worker", data);
    }
  }, onError);

  return {
    post: (message) => {
      logger?.debug("Sending message to Typst worker", { kind: message.kind });
      worker.postMessage(message);
    },
    close: () => {},
  };
};
