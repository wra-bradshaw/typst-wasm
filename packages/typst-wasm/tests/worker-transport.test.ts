import { Effect, Queue } from "effect";
import { makeWorkerTransport } from "../src/worker-transport";

class FakeWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;
  messages: unknown[] = [];

  postMessage(message: unknown) {
    this.messages.push(message);
  }

  emit(data: unknown) {
    this.onmessage?.({ data } as MessageEvent);
  }
}

describe("worker transport", () => {
  it("forwards outbound messages to worker", async () => {
    const worker = new FakeWorker();

    await Effect.runPromise(
      Effect.gen(function* () {
        const transport = yield* makeWorkerTransport(worker);
        transport.post({ kind: "compile", requestId: 1 });
      }),
    );

    expect(worker.messages).toEqual([{ kind: "compile", requestId: 1 }]);
  });

  it("queues only valid inbound worker messages", async () => {
    const worker = new FakeWorker();

    const msg = await Effect.runPromise(
      Effect.gen(function* () {
        const transport = yield* makeWorkerTransport(worker);
        worker.emit({ kind: "unknown_event" });
        worker.emit({ kind: "ready" });
        return yield* Queue.take(transport.incoming);
      }),
    );

    expect(msg).toEqual({ kind: "ready" });
  });
});
