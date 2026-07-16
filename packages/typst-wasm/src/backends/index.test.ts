import { describe, expect, it } from "vitest";
import {
  createRuntimeBackend,
  selectAutomaticBackendKind,
  type TypstRuntime,
  type BackendSelection,
} from "./index";
import type { TypstCompilerOptions } from "../compiler/types";

const makeRuntime = (worker: boolean, jspi: boolean): TypstRuntime => ({
  createWorker: (_options) => {
    throw new Error("not used");
  },
  supportsWorkerBackend: () => worker,
  supportsJspiBackend: () => jspi,
});

const options = {
  coreModules: {
    "engine.core.wasm": {} as WebAssembly.Module,
    "engine.core2.wasm": {} as WebAssembly.Module,
    "engine.core3.wasm": {} as WebAssembly.Module,
  },
};
const compilerOptions = options as unknown as TypstCompilerOptions;

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
        selectAutomaticBackendKind(makeRuntime(worker, jspi), compilerOptions),
      ).toBe(selected);
    },
  );

  it("throws immediately when the worker backend is requested without worker configuration", () => {
    const runtime = {
      ...makeRuntime(false, true),
      unavailableWorkerMessage: "Worker backend requires worker",
    };

    expect(() =>
      createRuntimeBackend(
        "worker",
        {
          fileLoaderManager: {} as never,
        },
        runtime,
        compilerOptions,
      ),
    ).toThrow("Worker backend requires worker");
  });
});
