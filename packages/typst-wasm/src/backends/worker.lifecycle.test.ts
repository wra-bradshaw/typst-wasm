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
    workerState.autoRespond = true;
    workerState.rejectInitialization = false;
    workerState.pendingMessages = [];
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

  it("surfaces init failures, clears the promise, and allows a later retry", async () => {
    const workerService = await makeService();
    workerState.rejectInitialization = true;

    await expect(workerService.init()).rejects.toThrow(
      "Worker command failed: init",
    );
    workerState.rejectInitialization = false;
    await expect(workerService.init()).resolves.toBeUndefined();
    expect(workerState.initMessages).toHaveLength(2);
    await workerService.dispose();
  });

  it("rejects all outstanding commands when the worker fails", async () => {
    const workerService = await makeService();
    await workerService.init();
    workerState.autoRespond = false;
    const commands = [
      workerService.listFiles(),
      workerService.compile({ format: "svg", main: "main.typ" }),
    ];

    workerState.emitError?.(new Error("worker crashed"));
    await expect(commands[0]).rejects.toThrow(
      "Worker command failed: list_files",
    );
    await expect(commands[1]).rejects.toThrow("Worker command failed: compile");
    await workerService.dispose();
  });

  it("rejects pending initialization when the worker fails", async () => {
    const workerService = await makeService();
    workerState.autoRespond = false;
    const initialization = workerService.init();

    workerState.emitError?.(new Error("worker crashed"));
    await expect(initialization).rejects.toThrow("Worker command failed: init");
    await workerService.dispose();
  });

  it("rejects initialization and commands with the disposal error", async () => {
    const workerService = await makeService();
    workerState.autoRespond = false;
    const initialization = workerService.init();
    await workerService.dispose();
    await expect(initialization).rejects.toMatchObject({
      cause: expect.objectContaining({ message: "Compiler has been disposed" }),
    });

    const second = await makeService();
    workerState.autoRespond = true;
    await second.init();
    workerState.autoRespond = false;
    const command = second.compile({ format: "svg", main: "main.typ" });
    await second.dispose();
    await expect(command).rejects.toMatchObject({
      cause: expect.objectContaining({ message: "Compiler has been disposed" }),
    });
  });

  it("terminates exactly once even when disposed repeatedly", async () => {
    const workerService = await makeService();
    await workerService.dispose();
    await workerService.dispose();
    expect(workerState.terminateCount).toBe(1);
  });
});
