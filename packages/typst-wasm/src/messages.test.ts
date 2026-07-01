import { describe, expect, it } from "vitest";
import { isRpcResponseMessage, isWorkerToMainMessage } from "./messages";

describe("message guards", () => {
  it("rejects ambiguous RPC responses from untrusted worker messages", () => {
    expect(isRpcResponseMessage({ requestId: 2, result: {} })).toBe(true);
    expect(
      isRpcResponseMessage({ requestId: 2, error: { message: "failed" } }),
    ).toBe(true);
    expect(isRpcResponseMessage({ requestId: 2, result: {}, error: {} })).toBe(
      false,
    );
  });

  it("only accepts well-formed worker fetch events", () => {
    expect(
      isWorkerToMainMessage({
        kind: "web_fetch",
        payload: { path: "main.typ" },
      }),
    ).toBe(true);
    expect(isWorkerToMainMessage({ kind: "web_fetch" })).toBe(false);
    expect(
      isWorkerToMainMessage({
        kind: "web_fetch",
        payload: { path: 1 },
      }),
    ).toBe(false);
    expect(isWorkerToMainMessage({ kind: "unknown" })).toBe(false);
  });
});
