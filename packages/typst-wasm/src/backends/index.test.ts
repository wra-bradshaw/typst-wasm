import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createRuntimeBackend,
  selectAutomaticBackendKind,
  supportsJspiBackend,
  supportsWorkerBackend,
} from "./index";
import type { TypstCompilerOptions } from "../compiler/types";

const options = {
  coreModules: {
    "engine.core.wasm": {} as WebAssembly.Module,
    "engine.core2.wasm": {} as WebAssembly.Module,
    "engine.core3.wasm": {} as WebAssembly.Module,
  },
} as unknown as TypstCompilerOptions;

afterEach(() => vi.unstubAllGlobals());

describe("compiler backend selection", () => {
  it("reports capabilities without requiring compiler options", () => {
    expect(typeof supportsWorkerBackend()).toBe("boolean");
    expect(typeof supportsJspiBackend()).toBe("boolean");
  });

  it("does not select worker without a configured worker", () => {
    expect(selectAutomaticBackendKind(options)).not.toBe("worker");
  });

  it("selects worker automatically when a worker is configured and primitives allow it", () => {
    const withWorker = {
      ...options,
      worker: () => ({ listen() {}, postMessage() {}, terminate() {} }),
    } as unknown as TypstCompilerOptions;
    const selected = selectAutomaticBackendKind(withWorker);
    expect(selected).toBe(
      supportsWorkerBackend()
        ? "worker"
        : supportsJspiBackend()
          ? "jspi"
          : "none",
    );
  });

  it("reports missing worker configuration for explicit worker selection", () => {
    expect(() =>
      createRuntimeBackend(
        "worker",
        { fileLoaderManager: {} as never },
        options,
      ),
    ).toThrow("Worker backend requires worker");
  });

  it("reports unavailable worker primitives separately", () => {
    vi.stubGlobal("SharedArrayBuffer", undefined);
    const withWorker = { ...options, worker: () => ({}) } as never;
    expect(() =>
      createRuntimeBackend(
        "worker",
        { fileLoaderManager: {} as never },
        withWorker,
      ),
    ).toThrow("Worker backend is unavailable");
  });
});
