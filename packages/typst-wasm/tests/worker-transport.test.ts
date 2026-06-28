import { describe, expect, it } from "vitest";
import { makeWorkerTransport } from "../src/worker-transport";

class FakeWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  messages: unknown[] = [];

  postMessage(message: unknown) {
    this.messages.push(message);
  }

  emit(data: unknown) {
    this.onmessage?.({ data } as MessageEvent);
  }
}

describe("worker transport", () => {
  it("forwards outbound messages to worker", () => {
    const worker = new FakeWorker();
    const transport = makeWorkerTransport(
      worker,
      () => undefined,
      () => undefined,
    );

    transport.post({ kind: "compile", requestId: 1 });

    expect(worker.messages).toEqual([{ kind: "compile", requestId: 1 }]);
  });

  it("forwards only valid inbound worker messages", () => {
    const worker = new FakeWorker();
    const messages: unknown[] = [];
    makeWorkerTransport(
      worker,
      (message) => messages.push(message),
      () => undefined,
    );

    worker.emit({ kind: "unknown_event" });
    worker.emit({ kind: "web_fetch", payload: { path: "main.typ" } });

    expect(messages).toEqual([
      { kind: "web_fetch", payload: { path: "main.typ" } },
    ]);
  });

  it("clears worker handlers on close", () => {
    const worker = new FakeWorker();
    const transport = makeWorkerTransport(
      worker,
      () => undefined,
      () => undefined,
    );

    transport.close();

    expect(worker.onmessage).toBeNull();
    expect(worker.onerror).toBeNull();
  });
});
