import { Effect, Ref } from "effect";
import { makeFetchBridge } from "../src/fetch-bridge";
import { SharedMemoryCommunicationStatus } from "../src/protocol";

describe("fetch bridge", () => {
  it("writes package bytes to shared memory and marks success", async () => {
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const disposed = yield* Ref.make(false);
        const bridge = makeFetchBridge(
          {
            getFile: () => Effect.succeed(new Uint8Array([1, 2, 3])),
          },
          disposed,
        );

        yield* bridge.handleFetchRequest("@preview/foo:0.1.0/file.typ");

        return {
          status: bridge.sharedMemoryCommunication.getStatus(),
          data: Array.from(bridge.sharedMemoryCommunication.getBuffer()),
        };
      }),
    );

    expect(result.status).toBe(SharedMemoryCommunicationStatus.Success);
    expect(result.data).toEqual([1, 2, 3]);
  });

  it("marks error when package loading fails", async () => {
    const status = await Effect.runPromise(
      Effect.gen(function* () {
        const disposed = yield* Ref.make(false);
        const bridge = makeFetchBridge(
          {
            getFile: () => Effect.fail(new Error("not found")),
          },
          disposed,
        );

        yield* bridge.handleFetchRequest("@preview/foo:0.1.0/missing.typ");
        return bridge.sharedMemoryCommunication.getStatus();
      }),
    );

    expect(status).toBe(SharedMemoryCommunicationStatus.Error);
  });

  it("does not write status if disposed while request is in flight", async () => {
    const status = await Effect.runPromise(
      Effect.gen(function* () {
        const disposed = yield* Ref.make(false);
        const bridge = makeFetchBridge(
          {
            getFile: () =>
              Effect.sleep("50 millis").pipe(Effect.as(new Uint8Array([9, 9, 9]))),
          },
          disposed,
        );

        const fiber = yield* Effect.fork(
          bridge.handleFetchRequest("@preview/foo:0.1.0/file.typ"),
        );

        yield* Effect.sleep("10 millis");
        yield* Ref.set(disposed, true);
        yield* fiber.await;

        return bridge.sharedMemoryCommunication.getStatus();
      }),
    );

    expect(status).toBe(SharedMemoryCommunicationStatus.None);
  });
});
