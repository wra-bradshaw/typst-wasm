import type { WasmDiagnostic } from "./wasm/typst_wasm";
import type { WasmModuleOrPath } from "./wasm-module";

const INITIAL_SAB_SIZE = 1024 * 1024; // 1MB
const MAX_SAB_SIZE = 4 * 1024 * 1024 * 1024; // 4GB
const DEFAULT_FETCH_TIMEOUT = 30000; // 30 seconds

export const SharedMemoryCommunicationStatus = {
  None: 0,
  Pending: 1,
  Error: 2,
  Success: 3,
} as const;

export type SharedMemoryCommunicationStatus = (typeof SharedMemoryCommunicationStatus)[keyof typeof SharedMemoryCommunicationStatus];

export class SharedMemoryCommunication {
  dataBuf: SharedArrayBuffer;
  statusBuf: SharedArrayBuffer;
  sizeBuf: SharedArrayBuffer;

  constructor() {
    this.dataBuf = new SharedArrayBuffer(INITIAL_SAB_SIZE, { maxByteLength: MAX_SAB_SIZE });
    this.statusBuf = new SharedArrayBuffer(4);
    this.sizeBuf = new SharedArrayBuffer(4);
  }

  getStatus(): SharedMemoryCommunicationStatus {
    const uint8view = new Int32Array(this.statusBuf);
    return uint8view[0] as SharedMemoryCommunicationStatus;
  }

  setStatus(status: SharedMemoryCommunicationStatus) {
    const uint8view = new Int32Array(this.statusBuf);
    Atomics.store(uint8view, 0, status);
    Atomics.notify(uint8view, 0, 1);
    return;
  }

  setBuffer(buf: Uint8Array) {
    const needed = buf.byteLength;
    const current = this.dataBuf.byteLength;

    // Validate against maximum size
    if (needed > MAX_SAB_SIZE) {
      throw new Error(`File too large: ${needed} bytes. Maximum allowed: ${MAX_SAB_SIZE} bytes (4GB).`);
    }

    if (needed > current) {
      this.dataBuf.grow(needed);
    }

    const bufView = new Uint8Array(this.dataBuf);
    bufView.set(buf);

    // Store the actual data size
    const sizeView = new Int32Array(this.sizeBuf);
    Atomics.store(sizeView, 0, needed);
  }

  getBuffer() {
    // Read the actual data size and return only that portion
    const sizeView = new Int32Array(this.sizeBuf);
    const size = Atomics.load(sizeView, 0);
    return new Uint8Array(this.dataBuf, 0, size);
  }

  /**
   * Wait for status change with timeout
   * @param expectedStatus - The status value to wait for
   * @param timeoutMs - Timeout in milliseconds (default: 30000ms)
   * @returns true if status changed, false if timed out
   */
  waitForStatusChange(expectedStatus: SharedMemoryCommunicationStatus, timeoutMs: number = DEFAULT_FETCH_TIMEOUT): boolean {
    const statusView = new Int32Array(this.statusBuf);

    // Atomics.wait returns "ok" | "not-equal" | "timed-out"
    const result = Atomics.wait(statusView, 0, expectedStatus, timeoutMs);

    return result === "ok";
  }

  static hydrateObj(obj: SharedMemoryCommunication) {
    const instantiation = new SharedMemoryCommunication();
    instantiation.dataBuf = obj.dataBuf;
    instantiation.statusBuf = obj.statusBuf;
    instantiation.sizeBuf = obj.sizeBuf;
    return instantiation;
  }
}

export interface TypstWorkerProtocol {
  init: {
    request: { sharedMemoryCommunication: SharedMemoryCommunication; moduleOrPath: WasmModuleOrPath };
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
    request: void;
    response: { svg: string; diagnostics: WasmDiagnostic[] };
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

export type ExcludePayloadIfEmpty<P> = P extends void ? NoPayload : { payload: P };

export type RpcRequestMessage<T> = {
  [K in keyof T]: {
    kind: K;
    requestId: number;
  } & (T[K] extends { request: infer P } ? ExcludePayloadIfEmpty<P> : NoPayload);
}[keyof T];

export type RpcResponseMessage<TResult = unknown, TError = unknown> = { requestId: number; result: TResult } | { requestId: number; error: TError };
