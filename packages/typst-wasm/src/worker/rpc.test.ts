import { describe, expect, it, vi } from "vitest";
import { WorkerError } from "../errors";
import { makeRpcClient } from "./rpc";

type Protocol = {
  ping: { request: { value: number }; response: string };
  reset: { request: void; response: void };
};

describe("makeRpcClient", () => {
  it("allocates request IDs and omits an absent payload", async () => {
    const sent: unknown[] = [];
    const client = makeRpcClient<Protocol>((message) => sent.push(message));

    const first = client.call("ping", { value: 4 });
    const second = client.call("reset");

    expect(sent).toEqual([
      { kind: "ping", requestId: 0, payload: { value: 4 } },
      { kind: "reset", requestId: 1 },
    ]);
    client.receive({ requestId: 0, result: "ok" });
    client.receive({ requestId: 1, result: undefined });
    await expect(first).resolves.toBe("ok");
    await expect(second).resolves.toBeUndefined();
  });

  it("rejects synchronous sender failures with the command name", async () => {
    const client = makeRpcClient<Protocol>(() => {
      throw new Error("closed");
    });

    await expect(client.call("ping", { value: 1 })).rejects.toMatchObject({
      name: "WorkerError",
      message: 'Failed to send worker command "ping"',
      cause: expect.objectContaining({ message: "closed" }),
    });
  });

  it("matches successes and errors, ignoring unknown response IDs", async () => {
    const client = makeRpcClient<Protocol>(vi.fn());
    client.receive({ requestId: 999, result: "ignored" });
    const success = client.call("ping", { value: 2 });
    const failure = client.call("reset");

    client.receive({ requestId: 0, result: "done" });
    client.receive({ requestId: 1, error: { code: "NOPE", nested: true } });

    await expect(success).resolves.toBe("done");
    await expect(failure).rejects.toMatchObject({
      name: "WorkerError",
      message: "Worker command failed: reset",
      cause: { code: "NOPE", nested: true },
    });
  });

  it("rejects every pending call and ignores late responses", async () => {
    const client = makeRpcClient<Protocol>(vi.fn());
    const first = client.call("ping", { value: 1 });
    const second = client.call("reset");
    const cause = new Error("worker crashed");

    client.rejectAll(cause);
    client.receive({ requestId: 0, result: "late" });
    client.receive({ requestId: 1, result: undefined });

    await expect(first).rejects.toBeInstanceOf(WorkerError);
    await expect(second).rejects.toMatchObject({
      message: "Worker command failed: reset",
      cause,
    });
  });
});
