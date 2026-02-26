import { Deferred, Effect, Layer, Ref } from "effect";
import { describe, expect, it } from "vitest";
import { CompilerBackend, selectAutomaticBackendKind } from "../src/compiler-backend";
import { TypstCompilerService } from "../src/index";

describe("compiler backend DI", () => {
  it("auto-selects worker when both worker and jspi capabilities are present", () => {
    const originalWorker = globalThis.Worker;
    const originalSAB = globalThis.SharedArrayBuffer;
    const originalAtomics = globalThis.Atomics;
    const originalWebAssembly = globalThis.WebAssembly;

    class FakeWorker {}

    Object.defineProperty(globalThis, "Worker", { configurable: true, value: FakeWorker });
    Object.defineProperty(globalThis, "SharedArrayBuffer", { configurable: true, value: class {} });
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
      Object.defineProperty(globalThis, "Worker", { configurable: true, value: originalWorker });
      Object.defineProperty(globalThis, "SharedArrayBuffer", { configurable: true, value: originalSAB });
      Object.defineProperty(globalThis, "Atomics", { configurable: true, value: originalAtomics });
      Object.defineProperty(globalThis, "WebAssembly", { configurable: true, value: originalWebAssembly });
    }
  });

  it("auto-selects jspi when worker support is unavailable", () => {
    const originalWorker = globalThis.Worker;
    const originalSAB = globalThis.SharedArrayBuffer;
    const originalAtomics = globalThis.Atomics;
    const originalWebAssembly = globalThis.WebAssembly;

    Object.defineProperty(globalThis, "Worker", { configurable: true, value: undefined });
    Object.defineProperty(globalThis, "SharedArrayBuffer", { configurable: true, value: undefined });
    Object.defineProperty(globalThis, "Atomics", { configurable: true, value: undefined });
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
      Object.defineProperty(globalThis, "Worker", { configurable: true, value: originalWorker });
      Object.defineProperty(globalThis, "SharedArrayBuffer", { configurable: true, value: originalSAB });
      Object.defineProperty(globalThis, "Atomics", { configurable: true, value: originalAtomics });
      Object.defineProperty(globalThis, "WebAssembly", { configurable: true, value: originalWebAssembly });
    }
  });

  it("auto-selects none when neither worker nor jspi is available", () => {
    const originalWorker = globalThis.Worker;
    const originalSAB = globalThis.SharedArrayBuffer;
    const originalAtomics = globalThis.Atomics;
    const originalWebAssembly = globalThis.WebAssembly;

    Object.defineProperty(globalThis, "Worker", { configurable: true, value: undefined });
    Object.defineProperty(globalThis, "SharedArrayBuffer", { configurable: true, value: undefined });
    Object.defineProperty(globalThis, "Atomics", { configurable: true, value: undefined });
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
      Object.defineProperty(globalThis, "Worker", { configurable: true, value: originalWorker });
      Object.defineProperty(globalThis, "SharedArrayBuffer", { configurable: true, value: originalSAB });
      Object.defineProperty(globalThis, "Atomics", { configurable: true, value: originalAtomics });
      Object.defineProperty(globalThis, "WebAssembly", { configurable: true, value: originalWebAssembly });
    }
  });

  it("uses injected backend implementation", async () => {
    const initCalls = await Effect.runPromise(Ref.make(0));
    const ready = await Effect.runPromise(Deferred.make<void>());

    const backendLayer = Layer.succeed(CompilerBackend, {
      ready: Deferred.await(ready),
      init: () =>
        Effect.gen(function* () {
          yield* Ref.update(initCalls, (n) => n + 1);
          yield* Deferred.succeed(ready, undefined);
        }),
      dispose: Effect.void,
      addFont: () => Effect.void,
      addFile: () => Effect.void,
      addSource: () => Effect.void,
      removeFile: () => Effect.void,
      clearFiles: Effect.void,
      listFiles: Effect.succeed(["main.typ"]),
      hasFile: () => Effect.succeed(true),
      setMain: () => Effect.void,
      compile: () => Effect.succeed({ svg: "<svg />", diagnostics: [] }),
    });

    const result = await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          const compiler = yield* TypstCompilerService;
          yield* compiler.init({ moduleOrPath: "test.wasm" });
          const files = yield* compiler.listFiles;
          const output = yield* compiler.compile();
          return { files, output };
        }).pipe(
          Effect.provide(TypstCompilerService.Default),
          Effect.provide(backendLayer),
        ),
      ),
    );

    const calls = await Effect.runPromise(Ref.get(initCalls));
    expect(calls).toBe(1);
    expect(result.files).toEqual(["main.typ"]);
    expect(result.output.svg).toBe("<svg />");
  });
});
