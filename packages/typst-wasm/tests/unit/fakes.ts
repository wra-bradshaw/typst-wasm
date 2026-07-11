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
    return {
      listen: (messageHandler, _errorHandler) => {
        onMessage = messageHandler;
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
      },
    };
  };
};
