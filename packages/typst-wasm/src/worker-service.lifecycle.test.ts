import { beforeEach, describe, expect, it, vi } from "vitest";
import { FileLoaderManager } from "./file-loader";

type WorkerMessage =
  | {
      kind: "init";
      requestId: number;
      payload: {
        wasmURL: string;
        glueURL: string;
      };
    }
  | {
      kind: Exclude<string, "init">;
      requestId: number;
      payload?: unknown;
    };

const workerState = {
  initMessages: [] as WorkerMessage[],
  terminateCount: 0,
};

class MockTypstWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;

  postMessage(message: unknown) {
    const msg = message as WorkerMessage;

    if (msg.kind === "init") {
      const payload = msg.payload as { wasmURL: string; glueURL: string };
      workerState.initMessages.push(msg);
      queueMicrotask(() => {
        if (payload.wasmURL === "bad.wasm") {
          this.onmessage?.({
            data: {
              requestId: msg.requestId,
              error: { message: "init failed" },
            },
          } as MessageEvent);
          return;
        }

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

vi.mock("./worker.ts?worker", () => ({
  default: MockTypstWorker,
}));

const makeService = async () => {
  const { WorkerService } = await import("./worker-service");
  return new WorkerService(new FileLoaderManager([]));
};

describe("worker service lifecycle", () => {
  beforeEach(() => {
    workerState.initMessages = [];
    workerState.terminateCount = 0;
  });

  it("treats repeated init as idempotent", async () => {
    const workerService = await makeService();

    await workerService.init({ wasmURL: "first.wasm", glueURL: "first.js" });
    await workerService.init({ wasmURL: "second.wasm", glueURL: "second.js" });

    expect(workerState.initMessages).toHaveLength(1);
    expect(workerState.initMessages[0]?.kind).toBe("init");
    expect(workerState.initMessages[0]?.payload).toMatchObject({
      wasmURL: "first.wasm",
      glueURL: "first.js",
    });
    await workerService.dispose();
  });

  it("makes dispose idempotent", async () => {
    const workerService = await makeService();

    await workerService.init({ wasmURL: "first.wasm", glueURL: "first.js" });
    await workerService.dispose();
    await workerService.dispose();

    expect(workerState.terminateCount).toBe(1);
  });

  it("rejects commands after dispose", async () => {
    const workerService = await makeService();

    await workerService.init({ wasmURL: "first.wasm", glueURL: "first.js" });
    await workerService.dispose();

    expect(() =>
      workerService.compile({
        format: "svg",
        main: null,
        inputs: null,
        pages: null,
        pdf_standards: null,
        ppi: null,
      }),
    ).toThrow("Compiler has been disposed");
  });

  it("surfaces init failures and allows a later retry", async () => {
    const workerService = await makeService();

    await expect(
      workerService.init({ wasmURL: "bad.wasm", glueURL: "bad.js" }),
    ).rejects.toThrow("Worker command failed: init");
    await expect(
      workerService.init({ wasmURL: "good.wasm", glueURL: "good.js" }),
    ).resolves.toBeUndefined();

    expect(workerState.initMessages).toHaveLength(2);
    await workerService.dispose();
  });
});
