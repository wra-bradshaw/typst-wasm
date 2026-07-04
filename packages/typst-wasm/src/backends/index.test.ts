import { describe, expect, it, vi } from "vitest";
import {
  createRuntimeBackend,
  selectAutomaticBackendKind,
  type TypstRuntime,
  type BackendSelection,
} from "./index";

vi.mock("@typst-wasm/engine-wasm/bridge", () => ({
  registerHostFetch: () => undefined,
  unregisterHostFetch: () => undefined,
}));

const makeRuntime = (worker: boolean, jspi: boolean): TypstRuntime => ({
  createWorker: (_options) => {
    throw new Error("not used");
  },
  loadWasmModule: () => {
    throw new Error("not used");
  },
  loadWasmSource: () => {
    throw new Error("not used");
  },
  supportsWorkerBackend: () => worker,
  supportsJspiBackend: () => jspi,
});

const options = {
  assets: {
    wasm: async () => new Uint8Array([1]),
  },
};

describe("compiler backend selection", () => {
  it.each([
    { worker: true, jspi: true, selected: "worker" },
    { worker: true, jspi: false, selected: "worker" },
    { worker: false, jspi: true, selected: "jspi" },
    { worker: false, jspi: false, selected: "none" },
  ] satisfies Array<{
    worker: boolean;
    jspi: boolean;
    selected: BackendSelection;
  }>)(
    "selects $selected when runtime reports worker=$worker and jspi=$jspi",
    ({ worker, jspi, selected }) => {
      expect(
        selectAutomaticBackendKind(makeRuntime(worker, jspi), options),
      ).toBe(selected);
    },
  );

  it("lets the same primitive environment produce different runtime decisions", () => {
    const nodeLikeRuntime = makeRuntime(true, false);
    const browserLikeRuntime = makeRuntime(false, true);

    expect(selectAutomaticBackendKind(nodeLikeRuntime, options)).toBe("worker");
    expect(selectAutomaticBackendKind(browserLikeRuntime, options)).toBe(
      "jspi",
    );
  });

  it("throws immediately when the worker backend is requested without worker configuration", () => {
    const runtime = {
      ...makeRuntime(false, true),
      unavailableWorkerMessage: "Worker backend requires assets.worker",
    };

    expect(() =>
      createRuntimeBackend(
        "worker",
        {
          fileLoaderManager: {} as never,
        },
        runtime,
        options,
      ),
    ).toThrow("Worker backend requires assets.worker");
  });

  it("lets auto select worker only when the runtime says worker is configured", () => {
    expect(selectAutomaticBackendKind(makeRuntime(false, true), options)).toBe(
      "jspi",
    );
    expect(selectAutomaticBackendKind(makeRuntime(true, true), options)).toBe(
      "worker",
    );
  });
});
