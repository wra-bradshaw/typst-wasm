import type { DirectServiceInternals } from "../../src/direct-service";
import type { TypstWorkerFactory } from "../../src/worker-service";
import type { WasmModule, WasmCompileOutput } from "../../src/wasm";

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

export interface FakeWorkerState {
  initMessages: WorkerMessage[];
  terminateCount: number;
}

export const makeFakeWorkerFactory = (
  state: FakeWorkerState,
): TypstWorkerFactory => {
  class FakeWorker {
    onmessage: ((event: MessageEvent) => void) | null = null;
    onerror: ((event: ErrorEvent) => void) | null = null;

    postMessage(message: unknown) {
      const msg = message as WorkerMessage;

      if (msg.kind === "init") {
        const payload = msg.payload as { wasmURL: string; glueURL: string };
        state.initMessages.push(msg);
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
      state.terminateCount += 1;
    }
  }

  return () => new FakeWorker() as unknown as Worker;
};

const textEncoder = new TextEncoder();

type HostFetch = (...args: number[]) => unknown;

export interface FakeDirectServiceHost {
  internals: DirectServiceInternals;
  hostFetchCount(): number;
  reset(): void;
}

export const makeFakeDirectServiceHost = (): FakeDirectServiceHost => {
  const hostFetchers = new Map<number, HostFetch>();
  const wasmState = {
    offset: 16,
    memory: new WebAssembly.Memory({ initial: 1 }),
    externrefs: new Map<number, unknown>(),
    nextExternref: 1,
  };

  class TypstCompiler {
    readonly __wbg_ptr: number;

    constructor(hostId: number) {
      this.__wbg_ptr = hostId;
    }

    free() {}

    add_font() {}
    add_file() {}
    add_source() {}
    remove_file() {}
    clear_files() {}
    list_files() {
      return [];
    }
    has_file() {
      return false;
    }
    set_main() {}
  }

  const malloc = (size: number): number => {
    const ptr = wasmState.offset;
    wasmState.offset += Math.max(size, 1);
    return ptr;
  };

  const typstcompiler_compile = async (hostId: number) => {
    const path = textEncoder.encode("shared.typ");
    const pathPtr = malloc(path.length);
    new Uint8Array(wasmState.memory.buffer, pathPtr, path.length).set(path);

    const resultLenPtr = malloc(4);
    const hostFetch = hostFetchers.get(hostId);
    if (!hostFetch) {
      throw new Error(`No host fetch registered for ${hostId}`);
    }
    const resultPtr = await hostFetch(pathPtr, path.length, resultLenPtr);
    const resultLen = new DataView(wasmState.memory.buffer).getUint32(
      resultLenPtr,
      true,
    );
    const outputBytes = new Uint8Array(
      wasmState.memory.buffer,
      Number(resultPtr),
      resultLen,
    ).slice();

    const externref = wasmState.nextExternref++;
    wasmState.externrefs.set(externref, {
      success: true,
      format: "pdf",
      output_text: null,
      output_bytes: outputBytes,
      pages: [],
      files: [],
      diagnostics: [],
      metadata: null,
      internal_error: null,
    } satisfies WasmCompileOutput);

    return [externref, 0, 0] as [number, number, number];
  };

  const wasmModule = {
    TypstCompiler,
    memory: wasmState.memory,
    __wbindgen_malloc: malloc,
    typstcompiler_compile,
    __wbindgen_externrefs: {
      get: (idx: number) => wasmState.externrefs.get(idx),
    },
    __externref_table_dealloc: (idx: number) => {
      wasmState.externrefs.delete(idx);
    },
  } as unknown as WasmModule;

  return {
    internals: {
      registerHostFetch: (hostId, hostFetch) => {
        hostFetchers.set(hostId, hostFetch as HostFetch);
      },
      unregisterHostFetch: (hostId) => {
        hostFetchers.delete(hostId);
      },
      loadWasmModule: async (assets) => {
        if (assets.wasmURL === "bad.wasm") {
          throw new Error("failed to load wasm");
        }
        return wasmModule;
      },
    },
    hostFetchCount: () => hostFetchers.size,
    reset: () => {
      hostFetchers.clear();
      wasmState.offset = 16;
      wasmState.externrefs.clear();
      wasmState.nextExternref = 1;
    },
  };
};

export const installJspiWebAssemblyMock = (): (() => void) => {
  const originalWebAssembly = globalThis.WebAssembly;

  Object.defineProperty(globalThis, "WebAssembly", {
    configurable: true,
    value: {
      ...originalWebAssembly,
      Suspending: function Suspending(fn: unknown) {
        return fn;
      },
      promising: (fn: (...args: unknown[]) => unknown) => {
        return async (...args: unknown[]) => await fn(...args);
      },
    },
  });

  return () => {
    Object.defineProperty(globalThis, "WebAssembly", {
      configurable: true,
      value: originalWebAssembly,
    });
  };
};
