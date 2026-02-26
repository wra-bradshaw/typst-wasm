import { Data, Deferred, Effect, Queue, Ref } from "effect";
import { isRpcResponseMessage } from "./messages";

export class RpcError extends Data.TaggedError("RpcError")<{
  readonly kind: string;
  readonly requestId: number;
  readonly message: string;
}> {}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

const extractRpcErrorMessage = (error: unknown): string => {
  if (typeof error === "string") return error;
  if (isRecord(error) && typeof error.message === "string") return error.message;

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
};

export interface RpcClient<Protocol> {
  readonly call: <K extends keyof Protocol>(kind: K, ...args: Protocol[K] extends { request: infer P } ? (P extends void ? [] : [payload: P]) : []) => Effect.Effect<Protocol[K] extends { response: infer R } ? R : void, RpcError>;
  readonly notify: (message: unknown) => Effect.Effect<void>;
  readonly receive: (response: unknown) => Effect.Effect<void>;
}

export const makeRpcClient = <Protocol>(sender: (message: unknown) => void): Effect.Effect<RpcClient<Protocol>> =>
  Effect.gen(function* () {
    const requestIdCounter = yield* Ref.make(0);
    const pendingDeferreds = yield* Ref.make(new Map<number, { deferred: Deferred.Deferred<unknown, RpcError>; kind: string }>());
    const outgoingQueue = yield* Queue.bounded<unknown>(32);

    yield* Effect.gen(function* () {
      while (true) {
        const msg = yield* Queue.take(outgoingQueue);
        sender(msg);
      }
    }).pipe(Effect.forkScoped);

    const receive = (response: unknown) =>
      Effect.gen(function* () {
        if (!isRpcResponseMessage(response)) {
          return;
        }

        const deferreds = yield* Ref.get(pendingDeferreds);
        const resp = response;

        const req = deferreds.get(resp.requestId);
        if (req) {
          if ("result" in resp) {
            yield* Deferred.succeed(req.deferred, resp.result);
          } else if ("error" in resp) {
            yield* Deferred.fail(
              req.deferred,
              new RpcError({
                kind: req.kind,
                requestId: resp.requestId,
                message: extractRpcErrorMessage(resp.error),
              }),
            );
          }
          yield* Ref.update(pendingDeferreds, (m) => {
            const newMap = new Map(m);
            newMap.delete(resp.requestId);
            return newMap;
          });
        }
      });

    const call = <K extends keyof Protocol>(kind: K, ...args: Protocol[K] extends { request: infer P } ? (P extends void ? [] : [payload: P]) : []): Effect.Effect<Protocol[K] extends { response: infer R } ? R : void, RpcError> =>
      Effect.gen(function* () {
        const requestId = yield* Ref.getAndUpdate(requestIdCounter, (n) => n + 1);
        const deferred = yield* Deferred.make<unknown, RpcError>();

        yield* Ref.update(pendingDeferreds, (m) => {
          const newMap = new Map(m);
          newMap.set(requestId, { deferred, kind: kind as string });
          return newMap;
        });

        const payload = args[0];

        if (payload !== undefined) {
          yield* Queue.offer(outgoingQueue, {
            kind,
            requestId,
            payload,
          });
        } else {
          yield* Queue.offer(outgoingQueue, {
            kind,
            requestId,
          });
        }

        return (yield* Deferred.await(deferred)) as Protocol[K] extends { response: infer R } ? R : void;
      });

    const notify = (message: unknown) => Queue.offer(outgoingQueue, message);

    return {
      call,
      notify,
      receive,
    };
  }) as unknown as Effect.Effect<RpcClient<Protocol>>;
