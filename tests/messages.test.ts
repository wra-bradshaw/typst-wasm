import {
  isMainToWorkerMessage,
  isRpcResponseMessage,
  isWorkerEventMessage,
  isWorkerToMainMessage,
} from "../src/messages";

describe("message guards", () => {
  it("accepts valid main->worker RPC request", () => {
    const msg = {
      kind: "compile",
      requestId: 1,
    };
    expect(isMainToWorkerMessage(msg)).toBe(true);
  });

  it("rejects malformed main->worker message", () => {
    const msg = {
      kind: "compile",
      requestId: "1",
    };
    expect(isMainToWorkerMessage(msg)).toBe(false);
  });

  it("accepts worker event messages", () => {
    expect(isWorkerEventMessage({ kind: "ready" })).toBe(true);
    expect(
      isWorkerEventMessage({
        kind: "web_fetch",
        payload: { path: "main.typ" },
      }),
    ).toBe(true);
  });

  it("accepts valid rpc responses and rejects ambiguous ones", () => {
    expect(isRpcResponseMessage({ requestId: 2, result: {} })).toBe(true);
    expect(isRpcResponseMessage({ requestId: 2, error: { message: "failed" } })).toBe(true);
    expect(isRpcResponseMessage({ requestId: 2, result: {}, error: {} })).toBe(false);
  });

  it("accepts worker->main union and rejects unknown messages", () => {
    expect(isWorkerToMainMessage({ requestId: 3, result: true })).toBe(true);
    expect(isWorkerToMainMessage({ kind: "ready" })).toBe(true);
    expect(isWorkerToMainMessage({ kind: "unknown" })).toBe(false);
  });
});
