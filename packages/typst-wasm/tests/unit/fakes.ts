import type { WorkerHost } from "../../src/worker/host";

export type FakeWorkerState = {
  initMessages: unknown[];
  terminateCount: number;
  autoRespond?: boolean;
  rejectInitialization?: boolean;
  pendingMessages?: unknown[];
  respond?: (response: unknown) => void;
  emitError?: (cause: unknown) => void;
};

export const makeFakeWorkerFactory = (
  state: FakeWorkerState,
): (() => WorkerHost) => {
  return () => {
    let onMessage: ((data: unknown) => void) | undefined;
    let onError: ((cause: unknown) => void) | undefined;
    state.pendingMessages ??= [];
    state.respond = (response) => onMessage?.(response);
    state.emitError = (cause) => onError?.(cause);
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
          if (state.autoRespond === false) {
            state.pendingMessages?.push(message);
            return;
          }
          const requestId = (message as { requestId: number }).requestId;
          const isInit = (message as { kind?: string }).kind === "init";
          queueMicrotask(() =>
            onMessage?.(
              state.rejectInitialization && isInit
                ? { requestId, error: new Error("initialization failed") }
                : { requestId, result: undefined },
            ),
          );
        }
      },
      terminate: () => {
        state.terminateCount += 1;
      },
    };
  };
};
