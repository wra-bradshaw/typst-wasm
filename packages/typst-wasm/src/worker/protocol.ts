import type {
  WasmBytes,
  WasmCompileOptions,
  WasmCompileOutput,
} from "../wasm/index";

export const SharedMemoryCommunicationStatus = {
  None: 0,
  Pending: 1,
  Error: 2,
  Success: 3,
} as const;

export type SharedMemoryCommunicationStatus =
  (typeof SharedMemoryCommunicationStatus)[keyof typeof SharedMemoryCommunicationStatus];

const MiB = 1024 * 1024;

const INITIAL_SAB_SIZE = 1 * MiB;
const MAX_SAB_SIZE = 256 * MiB;
const DEFAULT_FETCH_TIMEOUT = 30_000;

export class SharedMemoryCommunication {
  dataBuf: SharedArrayBuffer;
  statusBuf: SharedArrayBuffer;
  sizeBuf: SharedArrayBuffer;

  constructor(maxByteLength = MAX_SAB_SIZE) {
    this.dataBuf = new SharedArrayBuffer(INITIAL_SAB_SIZE, {
      maxByteLength,
    });
    this.statusBuf = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT);
    this.sizeBuf = new SharedArrayBuffer(Uint32Array.BYTES_PER_ELEMENT);
  }

  private statusView(): Int32Array {
    return new Int32Array(this.statusBuf);
  }

  private sizeView(): Uint32Array {
    return new Uint32Array(this.sizeBuf);
  }

  getStatus(): SharedMemoryCommunicationStatus {
    return Atomics.load(
      this.statusView(),
      0,
    ) as SharedMemoryCommunicationStatus;
  }

  setStatus(status: SharedMemoryCommunicationStatus): void {
    const view = this.statusView();

    Atomics.store(view, 0, status);
    Atomics.notify(view, 0, 1);
  }

  setBuffer(buf: Uint8Array): void {
    const needed = buf.byteLength;
    const maximum = this.dataBuf.maxByteLength;

    if (needed > maximum) {
      throw new RangeError(
        `File too large: ${needed} bytes. Maximum allowed: ${maximum} bytes.`,
      );
    }

    if (needed > this.dataBuf.byteLength) {
      try {
        this.dataBuf.grow(needed);
      } catch (cause) {
        throw new Error(
          `Unable to grow shared buffer from ` +
            `${this.dataBuf.byteLength} to ${needed} bytes.`,
          { cause },
        );
      }
    }

    // Use an explicitly bounded view rather than a view over all capacity.
    new Uint8Array(this.dataBuf, 0, needed).set(buf);

    // Publish the size after writing the data.
    Atomics.store(this.sizeView(), 0, needed);
  }

  getBuffer(): Uint8Array {
    const size = Atomics.load(this.sizeView(), 0);

    if (size > this.dataBuf.byteLength) {
      throw new Error(
        `Invalid shared buffer size ${size}; ` +
          `current buffer length is ${this.dataBuf.byteLength}.`,
      );
    }

    return new Uint8Array(this.dataBuf, 0, size);
  }

  waitForStatusChange(
    expectedStatus: SharedMemoryCommunicationStatus,
    timeoutMs = DEFAULT_FETCH_TIMEOUT,
  ): boolean {
    const view = this.statusView();
    const deadline = Date.now() + timeoutMs;

    while (Atomics.load(view, 0) === expectedStatus) {
      const remaining = deadline - Date.now();

      if (remaining <= 0) {
        return false;
      }

      const result = Atomics.wait(view, 0, expectedStatus, remaining);

      if (result === "timed-out" && Atomics.load(view, 0) === expectedStatus) {
        return false;
      }
    }

    return true;
  }

  static hydrateObj(obj: SharedMemoryCommunication): SharedMemoryCommunication {
    Object.setPrototypeOf(obj, SharedMemoryCommunication.prototype);
    return obj;
  }
}
