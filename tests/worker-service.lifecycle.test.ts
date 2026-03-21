import { Effect } from "effect";
import { beforeEach, describe, expect, it, vi } from "vitest";

type WorkerMessage =
  | {
      kind: "init";
      requestId: number;
      payload: {
        moduleOrPath: string;
      };
    }
  | { kind: string; requestId: number; payload?: unknown };

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
        if (msg.payload.moduleOrPath === "bad.wasm") {
          this.onmessage?.({
            data: { requestId: msg.requestId, error: { message: "init failed" } },
          } as MessageEvent);
          return;
        }

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

  it("surfaces init failures and allows a later retry", async () => {
    const { WorkerService } = await import("../src/worker-service");

    const result = await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          const workerService = yield* WorkerService;
          const firstAttempt = yield* Effect.either(workerService.init("bad.wasm"));
          const secondAttempt = yield* Effect.either(workerService.init("good.wasm"));
          yield* workerService.ready;
          return { firstAttempt, secondAttempt };
        }).pipe(Effect.provide(WorkerService.Default)),
      ),
    );

    expect(result.firstAttempt._tag).toBe("Left");
    if (result.firstAttempt._tag === "Left") {
      expect(result.firstAttempt.left._tag).toBe("RpcError");
      expect(result.firstAttempt.left.kind).toBe("init");
    }

    expect(result.secondAttempt._tag).toBe("Right");
    expect(workerState.initMessages).toHaveLength(2);
  });
});
