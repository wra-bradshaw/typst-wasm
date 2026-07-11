import { describe, expect, it } from "vitest";
import {
  SharedMemoryCommunication,
  SharedMemoryCommunicationError,
  SharedMemoryCommunicationStatus,
} from "./protocol";

describe("SharedMemoryCommunication", () => {
  it("writes, reads, and hydrates communication buffers", () => {
    const original = new SharedMemoryCommunication();
    const data = new Uint8Array([1, 2, 3]);
    original.setBuffer(data);
    original.setError(SharedMemoryCommunicationError.NotFound);
    original.setStatus(SharedMemoryCommunicationStatus.Success);
    const hydrated = SharedMemoryCommunication.hydrateObj(original);

    expect([...hydrated.getBuffer()]).toEqual([1, 2, 3]);
    expect(hydrated.getError()).toBe(SharedMemoryCommunicationError.NotFound);
    expect(hydrated.getStatus()).toBe(SharedMemoryCommunicationStatus.Success);
  });

  it("notifies status waiters and reports timeout", () => {
    const communication = new SharedMemoryCommunication();
    communication.setStatus(SharedMemoryCommunicationStatus.Pending);
    expect(
      communication.waitForStatusChange(
        SharedMemoryCommunicationStatus.Pending,
        0,
      ),
    ).toBe(false);
    communication.setStatus(SharedMemoryCommunicationStatus.Error);
    expect(
      communication.waitForStatusChange(
        SharedMemoryCommunicationStatus.Pending,
        1,
      ),
    ).toBe(true);
  });

  it("rejects buffers larger than the protocol maximum", () => {
    const communication = new SharedMemoryCommunication();
    expect(() =>
      communication.setBuffer({ byteLength: 257 * 1024 * 1024 } as Uint8Array),
    ).toThrow("File too large");
  });

  it("detects incomplete hydrated buffer objects when used", () => {
    const malformed = SharedMemoryCommunication.hydrateObj(
      {} as SharedMemoryCommunication,
    );
    expect(() => malformed.getStatus()).toThrow();
    expect(() => malformed.getBuffer()).toThrow();
  });
});
