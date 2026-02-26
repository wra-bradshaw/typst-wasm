import { Effect } from "effect";
import { beforeEach, describe, expect, it, vi } from "vitest";

type WorkerMessage =
  | { kind: "init"; requestId: number }
  | { kind: string; requestId: number };

const workerState = {
  initMessages: [] as WorkerMessage[],
  terminateCount: 0,
};

class MockTypstWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;

  postMessage(message: unknown) {
    const msg = message as WorkerMessage;

    if (msg.kind === "init") {
      workerState.initMessages.push(msg);
      queueMicrotask(() => {
        this.onmessage?.({ data: { kind: "ready" } } as MessageEvent);
        this.onmessage?.({
          data: { requestId: msg.requestId, result: undefined },
        } as MessageEvent);
      });
      return;
    }

    queueMicrotask(() => {
      this.onmessage?.({
        data: { requestId: msg.requestId, result: undefined },
      } as MessageEvent);
    });
  }

  terminate() {
    workerState.terminateCount += 1;
  }
}

vi.mock("../src/worker.ts?worker", () => ({
  default: MockTypstWorker,
}));

describe("worker service lifecycle", () => {
  beforeEach(() => {
    workerState.initMessages = [];
    workerState.terminateCount = 0;
  });

  it("treats repeated init as idempotent", async () => {
    const { WorkerService } = await import("../src/worker-service");

    await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          const workerService = yield* WorkerService;
          yield* workerService.init("first.wasm");
          yield* workerService.ready;
          yield* workerService.init("second.wasm");
        }).pipe(Effect.provide(WorkerService.Default)),
      ),
    );

    expect(workerState.initMessages).toHaveLength(1);
    expect(workerState.initMessages[0]?.kind).toBe("init");
  });

  it("makes dispose idempotent", async () => {
    const { WorkerService } = await import("../src/worker-service");

    await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          const workerService = yield* WorkerService;
          yield* workerService.init("first.wasm");
          yield* workerService.ready;
          yield* workerService.dispose;
          yield* workerService.dispose;
        }).pipe(Effect.provide(WorkerService.Default)),
      ),
    );

    expect(workerState.terminateCount).toBe(1);
  });
});
