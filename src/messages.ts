import type { RpcRequestMessage, RpcResponseMessage, TypstWorkerProtocol } from "./protocol";

export type MainToWorkerMessage = RpcRequestMessage<TypstWorkerProtocol>;

export type WorkerEventMessage =
  | {
      kind: "web_fetch";
      payload: {
        path: string;
      };
    }
  | {
      kind: "ready";
    };

export type WorkerToMainMessage = RpcResponseMessage | WorkerEventMessage;

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

export const isMainToWorkerMessage = (value: unknown): value is MainToWorkerMessage => {
  if (!isRecord(value)) return false;
  if (typeof value.kind !== "string") return false;
  return typeof value.requestId === "number";
};

export const isRpcResponseMessage = (value: unknown): value is RpcResponseMessage => {
  if (!isRecord(value)) return false;
  if (typeof value.requestId !== "number") return false;

  const hasResult = "result" in value;
  const hasError = "error" in value;
  return hasResult !== hasError;
};

export const isWorkerEventMessage = (value: unknown): value is WorkerEventMessage => {
  if (!isRecord(value)) return false;
  if (typeof value.kind !== "string") return false;

  if (value.kind === "ready") {
    return true;
  }

  if (value.kind === "web_fetch") {
    if (!("payload" in value) || !isRecord(value.payload)) return false;
    return typeof value.payload.path === "string";
  }

  return false;
};

export const isWorkerToMainMessage = (value: unknown): value is WorkerToMainMessage => isRpcResponseMessage(value) || isWorkerEventMessage(value);
