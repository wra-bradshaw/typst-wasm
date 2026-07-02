import { describe, expect, it, vi } from "vitest";
import {
  selectAutomaticBackendKind,
  type TypstRuntime,
  type BackendSelection,
} from "./index";

vi.mock("@typst-wasm/engine-wasm/bridge", () => ({
  registerHostFetch: () => undefined,
  unregisterHostFetch: () => undefined,
}));

const makeRuntime = (worker: boolean, jspi: boolean): TypstRuntime => ({
  createWorker: () => {
    throw new Error("not used");
  },
  loadWasmModule: () => {
    throw new Error("not used");
  },
  resolveAssets: () => ({}),
  supportsWorkerBackend: () => worker,
  supportsJspiBackend: () => jspi,
});

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
      expect(selectAutomaticBackendKind(makeRuntime(worker, jspi))).toBe(
        selected,
      );
    },
  );

  it("lets the same primitive environment produce different runtime decisions", () => {
    const nodeLikeRuntime = makeRuntime(true, false);
    const browserLikeRuntime = makeRuntime(false, true);

    expect(selectAutomaticBackendKind(nodeLikeRuntime)).toBe("worker");
    expect(selectAutomaticBackendKind(browserLikeRuntime)).toBe("jspi");
  });
});
