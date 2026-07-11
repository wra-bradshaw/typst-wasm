import type { WorkerHost } from "../../src/worker/host";

export type FakeWorkerState = {
  initMessages: unknown[];
  terminateCount: number;
};

export const makeFakeWorkerFactory = (
  state: FakeWorkerState,
): (() => WorkerHost) => {
  return () => {
    let onMessage: ((data: unknown) => void) | undefined;
    let onError: ((cause: unknown) => void) | undefined;

    return {
      listen: (messageHandler, errorHandler) => {
        onMessage = messageHandler;
        onError = errorHandler;
      },
      postMessage: (message: unknown) => {
        state.initMessages.push(message);
        if (
          typeof message === "object" &&
          message !== null &&
          "requestId" in message
        ) {
          queueMicrotask(() =>
            onMessage?.({
              requestId: (message as { requestId: number }).requestId,
              result: undefined,
            }),
          );
        }
      },
      terminate: () => {
        state.terminateCount += 1;
        onError = undefined;
      },
    };
  };
};
