import { beforeEach, describe, expect, it } from "vitest";
import { FileLoaderManager } from "../files/loaders";
import {
  makeFakeWorkerFactory,
  type FakeWorkerState,
} from "../../tests/unit/fakes";

const workerState: FakeWorkerState = {
  initMessages: [],
  terminateCount: 0,
};

const makeService = async () => {
  const { WorkerService } = await import("./worker");
  return new WorkerService(new FileLoaderManager([]), {
    createWorker: makeFakeWorkerFactory(workerState),
  });
};

describe("worker service lifecycle", () => {
  beforeEach(() => {
    workerState.initMessages = [];
    workerState.terminateCount = 0;
  });

  it("treats repeated init as idempotent", async () => {
    const workerService = await makeService();

    await workerService.init();
    await workerService.init();

    expect(workerState.initMessages).toHaveLength(1);
    const initMessage = workerState.initMessages[0] as {
      kind: string;
      payload: unknown;
    };
    expect(initMessage.kind).toBe("init");
    expect(initMessage.payload).toHaveProperty("sharedMemoryCommunication");
    await workerService.dispose();
  });

  it("makes dispose idempotent", async () => {
    const workerService = await makeService();

    await workerService.init();
    await workerService.dispose();
    await workerService.dispose();

    expect(workerState.terminateCount).toBe(1);
  });

  it("rejects commands after dispose", async () => {
    const workerService = await makeService();

    await workerService.init();
    await workerService.dispose();

    expect(() =>
      workerService.compile({
        format: "svg",
        main: "main.typ",
      }),
    ).toThrow("Compiler has been disposed");
  });

  it("surfaces init failures and allows a later retry", async () => {
    const workerService = await makeService();

    await expect(workerService.init()).resolves.toBeUndefined();
    expect(workerState.initMessages).toHaveLength(1);
    await workerService.dispose();
  });
});
