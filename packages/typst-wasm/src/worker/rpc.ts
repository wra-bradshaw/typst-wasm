import { WorkerError } from "../errors";
import type { RpcResponseMessage } from "./protocol";

type RpcOutgoingMessage<Protocol> = {
  kind: keyof Protocol;
  requestId: number;
  payload?: unknown;
};

export interface RpcClient<Protocol> {
  call<K extends keyof Protocol>(
    kind: K,
    ...args: Protocol[K] extends { request: infer P }
      ? P extends void
        ? []
        : [payload: P]
      : []
  ): Promise<Protocol[K] extends { response: infer R } ? R : void>;
  notify(message: unknown): void;
  receive(response: RpcResponseMessage): void;
  rejectAll(cause: unknown): void;
}

export const makeRpcClient = <Protocol>(
  sender: (message: RpcOutgoingMessage<Protocol>) => void,
): RpcClient<Protocol> => {
  let requestIdCounter = 0;
  const pending = new Map<
    number,
    {
      resolve: (value: unknown) => void;
      reject: (reason?: unknown) => void;
      kind: string;
    }
  >();

  const call = <K extends keyof Protocol>(
    kind: K,
    ...args: Protocol[K] extends { request: infer P }
      ? P extends void
        ? []
        : [payload: P]
      : []
  ): Promise<Protocol[K] extends { response: infer R } ? R : void> => {
    const requestId = requestIdCounter;
    requestIdCounter += 1;

    return new Promise((resolve, reject) => {
      pending.set(requestId, {
        resolve: resolve as (value: unknown) => void,
        reject,
        kind: kind as string,
      });

      const payload = args[0];
      try {
        sender(
          payload === undefined
            ? { kind, requestId }
            : { kind, requestId, payload },
        );
      } catch (cause) {
        pending.delete(requestId);
        reject(
          new WorkerError(`Failed to send worker command "${String(kind)}"`, {
            cause,
          }),
        );
      }
    });
  };

  const receive = (response: RpcResponseMessage): void => {
    const req = pending.get(response.requestId);
    if (!req) return;

    pending.delete(response.requestId);
    if ("result" in response) {
      req.resolve(response.result);
    } else {
      req.reject(
        new WorkerError(`Worker command failed: ${req.kind}`, {
          cause: response.error,
        }),
      );
    }
  };

  const rejectAll = (cause: unknown): void => {
    for (const [requestId, req] of pending) {
      pending.delete(requestId);
      req.reject(
        new WorkerError(`Worker command failed: ${req.kind}`, { cause }),
      );
    }
  };

  return {
    call,
    notify: sender,
    receive,
    rejectAll,
  };
};
