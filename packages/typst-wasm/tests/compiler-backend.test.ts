import { describe, expect, it } from "vitest";
import { selectAutomaticBackendKind } from "../src/compiler-backend";

describe("compiler backend selection", () => {
  it("auto-selects worker when both worker and jspi capabilities are present", () => {
    const originalWorker = globalThis.Worker;
    const originalSAB = globalThis.SharedArrayBuffer;
    const originalAtomics = globalThis.Atomics;
    const originalWebAssembly = globalThis.WebAssembly;

    class FakeWorker {}

    Object.defineProperty(globalThis, "Worker", {
      configurable: true,
      value: FakeWorker,
    });
    Object.defineProperty(globalThis, "SharedArrayBuffer", {
      configurable: true,
      value: class {},
    });
    Object.defineProperty(globalThis, "Atomics", {
      configurable: true,
      value: {
        wait: () => "ok",
      },
    });
    Object.defineProperty(globalThis, "WebAssembly", {
      configurable: true,
      value: {
        ...originalWebAssembly,
        Suspending: function Suspending() {},
        promising: () => undefined,
      },
    });

    try {
      expect(selectAutomaticBackendKind()).toBe("worker");
    } finally {
      Object.defineProperty(globalThis, "Worker", {
        configurable: true,
        value: originalWorker,
      });
      Object.defineProperty(globalThis, "SharedArrayBuffer", {
        configurable: true,
        value: originalSAB,
      });
      Object.defineProperty(globalThis, "Atomics", {
        configurable: true,
        value: originalAtomics,
      });
      Object.defineProperty(globalThis, "WebAssembly", {
        configurable: true,
        value: originalWebAssembly,
      });
    }
  });

  it("auto-selects jspi when worker support is unavailable", () => {
    const originalWorker = globalThis.Worker;
    const originalSAB = globalThis.SharedArrayBuffer;
    const originalAtomics = globalThis.Atomics;
    const originalWebAssembly = globalThis.WebAssembly;

    Object.defineProperty(globalThis, "Worker", {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(globalThis, "SharedArrayBuffer", {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(globalThis, "Atomics", {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(globalThis, "WebAssembly", {
      configurable: true,
      value: {
        ...originalWebAssembly,
        Suspending: function Suspending() {},
        promising: () => undefined,
      },
    });

    try {
      expect(selectAutomaticBackendKind()).toBe("jspi");
    } finally {
      Object.defineProperty(globalThis, "Worker", {
        configurable: true,
        value: originalWorker,
      });
      Object.defineProperty(globalThis, "SharedArrayBuffer", {
        configurable: true,
        value: originalSAB,
      });
      Object.defineProperty(globalThis, "Atomics", {
        configurable: true,
        value: originalAtomics,
      });
      Object.defineProperty(globalThis, "WebAssembly", {
        configurable: true,
        value: originalWebAssembly,
      });
    }
  });

  it("auto-selects none when neither worker nor jspi is available", () => {
    const originalWorker = globalThis.Worker;
    const originalSAB = globalThis.SharedArrayBuffer;
    const originalAtomics = globalThis.Atomics;
    const originalWebAssembly = globalThis.WebAssembly;

    Object.defineProperty(globalThis, "Worker", {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(globalThis, "SharedArrayBuffer", {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(globalThis, "Atomics", {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(globalThis, "WebAssembly", {
      configurable: true,
      value: {
        ...originalWebAssembly,
        Suspending: undefined,
        promising: undefined,
      },
    });

    try {
      expect(selectAutomaticBackendKind()).toBe("none");
    } finally {
      Object.defineProperty(globalThis, "Worker", {
        configurable: true,
        value: originalWorker,
      });
      Object.defineProperty(globalThis, "SharedArrayBuffer", {
        configurable: true,
        value: originalSAB,
      });
      Object.defineProperty(globalThis, "Atomics", {
        configurable: true,
        value: originalAtomics,
      });
      Object.defineProperty(globalThis, "WebAssembly", {
        configurable: true,
        value: originalWebAssembly,
      });
    }
  });
});
