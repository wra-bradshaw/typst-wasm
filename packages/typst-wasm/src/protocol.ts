import type { WasmCompileOptions, WasmCompileOutput } from "./wasm";

const INITIAL_SAB_SIZE = 1024 * 1024;
const MAX_SAB_SIZE = 4 * 1024 * 1024 * 1024;
const DEFAULT_FETCH_TIMEOUT = 30000;

export const SharedMemoryCommunicationStatus = {
  None: 0,
  Pending: 1,
  Error: 2,
  Success: 3,
} as const;

export type SharedMemoryCommunicationStatus =
  (typeof SharedMemoryCommunicationStatus)[keyof typeof SharedMemoryCommunicationStatus];

export class SharedMemoryCommunication {
  dataBuf: SharedArrayBuffer;
  statusBuf: SharedArrayBuffer;
  sizeBuf: SharedArrayBuffer;

  constructor() {
    this.dataBuf = new SharedArrayBuffer(INITIAL_SAB_SIZE, {
      maxByteLength: MAX_SAB_SIZE,
    });
    this.statusBuf = new SharedArrayBuffer(4);
    this.sizeBuf = new SharedArrayBuffer(4);
  }

  getStatus(): SharedMemoryCommunicationStatus {
    return Atomics.load(
      new Int32Array(this.statusBuf),
      0,
    ) as SharedMemoryCommunicationStatus;
  }

  setStatus(status: SharedMemoryCommunicationStatus): void {
    const statusView = new Int32Array(this.statusBuf);
    Atomics.store(statusView, 0, status);
    Atomics.notify(statusView, 0, 1);
  }

  setBuffer(buf: Uint8Array): void {
    const needed = buf.byteLength;
    if (needed > MAX_SAB_SIZE) {
      throw new Error(
        `File too large: ${needed} bytes. Maximum allowed: ${MAX_SAB_SIZE} bytes.`,
      );
    }

    if (needed > this.dataBuf.byteLength) {
      this.dataBuf.grow(needed);
    }

    new Uint8Array(this.dataBuf).set(buf);
    Atomics.store(new Int32Array(this.sizeBuf), 0, needed);
  }

  getBuffer(): Uint8Array {
    const size = Atomics.load(new Int32Array(this.sizeBuf), 0);
    return new Uint8Array(this.dataBuf, 0, size);
  }

  waitForStatusChange(
    expectedStatus: SharedMemoryCommunicationStatus,
    timeoutMs = DEFAULT_FETCH_TIMEOUT,
  ): boolean {
    return (
      Atomics.wait(
        new Int32Array(this.statusBuf),
        0,
        expectedStatus,
        timeoutMs,
      ) === "ok"
    );
  }

  static hydrateObj(obj: SharedMemoryCommunication): SharedMemoryCommunication {
    // Structured cloning preserves the SharedArrayBuffers but drops the class
    // prototype, so the worker rehydrates the plain cloned object before using
    // the SharedMemoryCommunication methods.
    const instantiation = new SharedMemoryCommunication();
    instantiation.dataBuf = obj.dataBuf;
    instantiation.statusBuf = obj.statusBuf;
    instantiation.sizeBuf = obj.sizeBuf;
    return instantiation;
  }
}

export interface TypstWorkerProtocol {
  init: {
    request: {
      sharedMemoryCommunication: SharedMemoryCommunication;
      wasmURL: string;
      glueURL: string;
    };
    response: void;
  };
  add_file: {
    request: { path: string; data: Uint8Array };
    response: void;
  };
  add_source: {
    request: { path: string; text: string };
    response: void;
  };
  add_font: {
    request: { data: Uint8Array };
    response: void;
  };
  remove_file: {
    request: { path: string };
    response: void;
  };
  clear_files: {
    request: void;
    response: void;
  };
  set_main: {
    request: { path: string };
    response: void;
  };
  compile: {
    request: { options: WasmCompileOptions };
    response: WasmCompileOutput;
  };
  list_files: {
    request: void;
    response: string[];
  };
  has_file: {
    request: { path: string };
    response: boolean;
  };
}

type NoPayload = Record<never, never>;

export type ExcludePayloadIfEmpty<P> = P extends void
  ? NoPayload
  : { payload: P };

export type RpcRequestMessage<T> = {
  [K in keyof T]: {
    kind: K;
    requestId: number;
  } & (T[K] extends { request: infer P }
    ? ExcludePayloadIfEmpty<P>
    : NoPayload);
}[keyof T];

export type RpcResponseMessage<TResult = unknown, TError = unknown> =
  | { requestId: number; result: TResult }
  | { requestId: number; error: TError };
