import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FileLoaderManager } from "../src/file-loader";
import type { TypstFileLoader } from "../src/types";

const textEncoder = new TextEncoder();

const bridgeState = vi.hoisted(() => ({
  hostFetchers: new Map<number, (...args: number[]) => unknown>(),
}));

const wasmState = vi.hoisted(() => ({
  offset: 16,
  memory: new WebAssembly.Memory({ initial: 1 }),
  externrefs: new Map<number, unknown>(),
  nextExternref: 1,
}));

vi.mock("@typst-wasm/engine-wasm/bridge", () => ({
  registerHostFetch: (
    hostId: number,
    hostFetch: (...args: number[]) => unknown,
  ) => {
    bridgeState.hostFetchers.set(hostId, hostFetch);
  },
  unregisterHostFetch: (hostId: number) => {
    bridgeState.hostFetchers.delete(hostId);
  },
  host_fetch: (
    hostId: number,
    pathPtr: number,
    pathLen: number,
    resultLenPtr: number,
  ) => {
    const hostFetch = bridgeState.hostFetchers.get(hostId);
    if (!hostFetch) {
      throw new Error(`No host fetch registered for ${hostId}`);
    }
    return hostFetch(pathPtr, pathLen, resultLenPtr);
  },
}));

vi.mock("../src/wasm-loader", async () => {
  const bridge = await import("@typst-wasm/engine-wasm/bridge");

  class TypstCompiler {
    readonly __wbg_ptr: number;

    constructor(hostId: number) {
      this.__wbg_ptr = hostId;
    }

    free() {}
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
    const resultPtr = await bridge.host_fetch(
      hostId,
      pathPtr,
      path.length,
      resultLenPtr,
    );
    const resultLen = new DataView(wasmState.memory.buffer).getUint32(
      resultLenPtr,
      true,
    );
    const outputBytes = new Uint8Array(
      wasmState.memory.buffer,
      resultPtr,
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
    });

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
  };

  return {
    loadWasmModule: async (assets: { wasmURL: string }) => {
      if (assets.wasmURL === "bad.wasm") {
        throw new Error("failed to load wasm");
      }
      return wasmModule;
    },
  };
});

const makeLoader = (value: number): TypstFileLoader => ({
  load: async (request) =>
    request.path === "shared.typ" ? new Uint8Array([value]) : null,
});

describe("DirectService host fetch routing", () => {
  const originalWebAssembly = globalThis.WebAssembly;

  beforeEach(() => {
    bridgeState.hostFetchers.clear();
    wasmState.offset = 16;
    wasmState.externrefs.clear();
    wasmState.nextExternref = 1;

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
  });

  afterEach(() => {
    Object.defineProperty(globalThis, "WebAssembly", {
      configurable: true,
      value: originalWebAssembly,
    });
  });

  it("keeps concurrent JSPI compiler instances on separate host fetchers", async () => {
    const { DirectService } = await import("../src/direct-service");
    const first = new DirectService(new FileLoaderManager([makeLoader(1)]));
    const second = new DirectService(new FileLoaderManager([makeLoader(2)]));

    await Promise.all([
      first.init({ wasmURL: "ignored.wasm", glueURL: "ignored.js" }),
      second.init({ wasmURL: "ignored.wasm", glueURL: "ignored.js" }),
    ]);

    const [firstResult, secondResult] = await Promise.all([
      first.compile({
        format: "pdf",
        main: null,
        inputs: null,
        pages: null,
        pdf_standards: null,
        ppi: null,
      }),
      second.compile({
        format: "pdf",
        main: null,
        inputs: null,
        pages: null,
        pdf_standards: null,
        ppi: null,
      }),
    ]);

    expect([...firstResult.output_bytes!]).toEqual([1]);
    expect([...secondResult.output_bytes!]).toEqual([2]);
    expect(bridgeState.hostFetchers.size).toBe(2);

    await first.dispose();
    await second.dispose();

    expect(bridgeState.hostFetchers.size).toBe(0);
  });

  it("surfaces init failures and allows a later retry", async () => {
    const { DirectService } = await import("../src/direct-service");
    const service = new DirectService(new FileLoaderManager([makeLoader(1)]));

    await expect(
      service.init({ wasmURL: "bad.wasm", glueURL: "bad.js" }),
    ).rejects.toThrow("failed to load wasm");
    await expect(
      service.init({ wasmURL: "good.wasm", glueURL: "good.js" }),
    ).resolves.toBeUndefined();

    await service.dispose();
  });
});
