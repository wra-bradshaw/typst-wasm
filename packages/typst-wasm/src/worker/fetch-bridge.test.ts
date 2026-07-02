import { describe, expect, it, vi } from "vitest";
import {
  FetchFileLoader,
  FileLoaderManager,
  type FetchImpl,
} from "../files/loaders";
import { makeFetchBridge } from "./fetch-bridge";
import { SharedMemoryCommunicationStatus } from "./protocol";

describe("fetch bridge", () => {
  it("writes package bytes into shared memory on success", async () => {
    const bridge = makeFetchBridge(
      new FileLoaderManager([{ load: async () => new Uint8Array([1, 2, 3]) }]),
      () => false,
    );

    await bridge.handleFetchRequest("@preview/test:0.1.0/file.typ");

    expect(bridge.sharedMemoryCommunication.getStatus()).toBe(
      SharedMemoryCommunicationStatus.Success,
    );
    expect([...bridge.sharedMemoryCommunication.getBuffer()]).toEqual([
      1, 2, 3,
    ]);
  });

  it("sets error status on loader failure", async () => {
    const bridge = makeFetchBridge(
      new FileLoaderManager([
        {
          load: async () => {
            throw new Error("not found");
          },
        },
      ]),
      () => false,
    );

    await bridge.handleFetchRequest("@preview/test:0.1.0/file.typ");

    expect(bridge.sharedMemoryCommunication.getStatus()).toBe(
      SharedMemoryCommunicationStatus.Error,
    );
  });

  it("does not publish results after disposal", async () => {
    let disposed = false;
    const bridge = makeFetchBridge(
      new FileLoaderManager([{ load: async () => new Uint8Array([9, 9, 9]) }]),
      () => disposed,
    );

    disposed = true;
    await bridge.handleFetchRequest("@preview/test:0.1.0/file.typ");

    expect(bridge.sharedMemoryCommunication.getStatus()).toBe(
      SharedMemoryCommunicationStatus.None,
    );
  });

  it("uses the provided fetch implementation for non-package paths", async () => {
    const fetchImpl: FetchImpl = vi.fn(
      async () => new Response(new Uint8Array([4, 5])),
    );
    const bridge = makeFetchBridge(
      new FileLoaderManager([new FetchFileLoader(fetchImpl)]),
      () => false,
    );

    await bridge.handleFetchRequest("/image.png");

    expect(fetchImpl).toHaveBeenCalledWith("/image.png");
    expect([...bridge.sharedMemoryCommunication.getBuffer()]).toEqual([4, 5]);
  });
});
