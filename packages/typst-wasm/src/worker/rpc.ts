import { WorkerError } from "../errors";
import type {
  RequestOf,
  ResponseOf,
  RpcRequestMessage,
  RpcResponseMessage,
} from "./protocol";

type RpcMethod<Protocol, K extends keyof Protocol> = Protocol[K];
type RpcResult<Protocol, K extends keyof Protocol> = ResponseOf<
  RpcMethod<Protocol, K>
>;

type CallArgs<Protocol, K extends keyof Protocol> =
  RequestOf<RpcMethod<Protocol, K>> extends void
    ? []
    : [payload: RequestOf<RpcMethod<Protocol, K>>];

export interface RpcClient<Protocol> {
  call<K extends keyof Protocol>(
    kind: K,
    ...args: CallArgs<Protocol, K>
  ): Promise<RpcResult<Protocol, K>>;
  receive(response: RpcResponseMessage): void;
  rejectAll(cause: unknown): void;
}

export const makeRpcClient = <Protocol>(
  sender: (message: RpcRequestMessage<Protocol>) => void,
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
    ...args: CallArgs<Protocol, K>
  ): Promise<RpcResult<Protocol, K>> => {
    const requestId = requestIdCounter++;
    return new Promise((resolve, reject) => {
      pending.set(requestId, {
        resolve: resolve as (value: unknown) => void,
        reject,
        kind: String(kind),
      });
      const payload = args[0];
      try {
        sender(
          (payload === undefined
            ? { kind, requestId }
            : { kind, requestId, payload }) as RpcRequestMessage<Protocol>,
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
    if ("result" in response) req.resolve(response.result);
    else
      req.reject(
        new WorkerError(`Worker command failed: ${req.kind}`, {
          cause: response.error,
        }),
      );
  };

  const rejectAll = (cause: unknown): void => {
    for (const [requestId, req] of pending) {
      pending.delete(requestId);
      req.reject(
        new WorkerError(`Worker command failed: ${req.kind}`, { cause }),
      );
    }
  };

  return { call, receive, rejectAll };
};
