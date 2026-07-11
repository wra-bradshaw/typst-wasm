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
        payload: { request: { path: "main.typ", kind: "project" } },
      }),
    ).toBe(true);
    expect(isWorkerToMainMessage({ kind: "web_fetch" })).toBe(false);
    expect(
      isWorkerToMainMessage({
        kind: "web_fetch",
        payload: { request: { path: 1, kind: "project" } },
      }),
    ).toBe(false);
    expect(isWorkerToMainMessage({ kind: "unknown" })).toBe(false);
  });
});
