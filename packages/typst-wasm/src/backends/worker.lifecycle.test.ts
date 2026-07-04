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

    await workerService.init(new Uint8Array([1]));
    await workerService.init(new Uint8Array([2]));

    expect(workerState.initMessages).toHaveLength(1);
    expect(workerState.initMessages[0]?.kind).toBe("init");
    expect(
      (workerState.initMessages[0]?.payload as { wasmBytes: Uint8Array })
        .wasmBytes,
    ).toEqual(new Uint8Array([1]));
    await workerService.dispose();
  });

  it("makes dispose idempotent", async () => {
    const workerService = await makeService();

    await workerService.init(new Uint8Array([1]));
    await workerService.dispose();
    await workerService.dispose();

    expect(workerState.terminateCount).toBe(1);
  });

  it("rejects commands after dispose", async () => {
    const workerService = await makeService();

    await workerService.init(new Uint8Array([1]));
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

    await expect(workerService.init(new Uint8Array([0]))).rejects.toThrow(
      "Worker command failed: init",
    );
    await expect(
      workerService.init(new Uint8Array([1])),
    ).resolves.toBeUndefined();

    expect(workerState.initMessages).toHaveLength(2);
    await workerService.dispose();
  });
});
