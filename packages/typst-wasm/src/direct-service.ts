import { Data, Deferred, Effect, Ref } from "effect";
import { PackageManager } from "./package-manager";
import type { WasmModuleOrPath } from "./wasm-module";
import {
  loadWasmModule,
  type InitOutput,
  type TypstCompilerInstance,
  type WasmDiagnostic,
} from "./wasm";

class DirectServiceError extends Data.TaggedError("DirectServiceError")<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

const MAX_FETCH_ATTEMPTS = 3;
const textDecoder = new TextDecoder();

const hasJspiSupport = (): boolean => {
  const wasm = WebAssembly as unknown as {
    Suspending?: unknown;
    promising?: unknown;
  };

  return typeof wasm.Suspending === "function" && typeof wasm.promising === "function";
};

const retry = async <T>(task: () => Promise<T>, maxAttempts: number): Promise<T> => {
  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      return await task();
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error("Unknown host fetch error");
};

export class DirectService extends Effect.Service<DirectService>()("DirectService", {
  scoped: Effect.gen(function* () {
    const packageManager = yield* PackageManager;
    let wasmExportsRuntime: InitOutput | null = null;

    const disposed = yield* Ref.make(false);
    const initialized = yield* Ref.make(false);
    const readyDeferred = yield* Deferred.make<void>();
    const compilerRef = yield* Ref.make<TypstCompilerInstance | null>(null);
    const wasmExportsRef = yield* Ref.make<InitOutput | null>(null);
    const compileRef = yield* Ref.make<((compilerPtr: number) => Promise<[number, number, number]>) | null>(null);

    const ensureCompiler = <T>(run: (compiler: TypstCompilerInstance) => T, name: string): Effect.Effect<T, DirectServiceError> =>
      Effect.gen(function* () {
        const compiler = yield* Ref.get(compilerRef);
        if (!compiler) {
          return yield* Effect.fail(new DirectServiceError({ message: "Compiler not initialized" }));
        }

        return yield* Effect.try({
          try: () => run(compiler),
          catch: (cause) => new DirectServiceError({ message: `Direct command failed: ${name}`, cause }),
        });
      });

    const pathFromWasm = (wasmExports: InitOutput, pathPtr: number, pathLen: number): string => textDecoder.decode(new Uint8Array(wasmExports.memory.buffer, pathPtr, pathLen));

    const writeResultLength = (wasmExports: InitOutput, resultLenPtr: number, len: number) => {
      new DataView(wasmExports.memory.buffer).setUint32(resultLenPtr, len, true);
    };

    const copyIntoWasm = (wasmExports: InitOutput, bytes: Uint8Array, resultLenPtr: number): number => {
      const resultPtr = wasmExports.__wbindgen_malloc(bytes.length, 1);
      new Uint8Array(wasmExports.memory.buffer, resultPtr, bytes.length).set(bytes);
      writeResultLength(wasmExports, resultLenPtr, bytes.length);
      return resultPtr;
    };

    const fetchBytes = async (path: string): Promise<Uint8Array> => {
      if (path.startsWith("@")) {
        return await Effect.runPromise(packageManager.getFile(path));
      }

      const response = await fetch(path);
      if (!response.ok) {
        throw new Error(`Failed to fetch "${path}" with status ${response.status}`);
      }

      return new Uint8Array(await response.arrayBuffer());
    };

    const hostFetch = async (pathPtr: number, pathLen: number, resultLenPtr: number): Promise<number> => {
      const wasmExports = wasmExportsRuntime;
      if (!wasmExports) {
        throw new Error("WASM exports not initialized");
      }

      const path = pathFromWasm(wasmExports, pathPtr, pathLen);

      try {
        const bytes = await retry(() => fetchBytes(path), MAX_FETCH_ATTEMPTS);
        return copyIntoWasm(wasmExports, bytes, resultLenPtr);
      } catch {
        writeResultLength(wasmExports, resultLenPtr, 0);
        return 0;
      }
    };

    const initDirect = (moduleOrPath: WasmModuleOrPath) =>
      Effect.gen(function* () {
        if (!hasJspiSupport()) {
          return yield* Effect.fail(new DirectServiceError({ message: "JSPI is unavailable in this runtime" }));
        }

        if (yield* Ref.get(disposed)) return;
        if (yield* Ref.get(initialized)) return;

        const initializedCompiler = yield* Effect.tryPromise({
          try: async () => {
            const wasmModule = await loadWasmModule();
            const suspending = new (
              WebAssembly as unknown as {
                Suspending: new (fn: (pathPtr: number, pathLen: number, resultLenPtr: number) => Promise<number>) => (pathPtr: number, pathLen: number, resultLenPtr: number) => number;
              }
            ).Suspending(hostFetch);

            const wasmExports = await wasmModule.default({
              module_or_path: moduleOrPath,
              imports: {
                bridge: {
                  host_fetch: suspending,
                },
              },
            });

            const promising = (
              WebAssembly as unknown as {
                promising: (fn: (compilerPtr: number) => [number, number, number]) => (compilerPtr: number) => Promise<[number, number, number]>;
              }
            ).promising;

            return {
              wasmExports,
              compile: promising(wasmExports.typstcompiler_compile as (compilerPtr: number) => [number, number, number]),
              compiler: new wasmModule.TypstCompiler(),
            };
          },
          catch: (cause) =>
            new DirectServiceError({
              message: "Failed to initialize direct JSPI compiler",
              cause,
            }),
        });

        yield* Ref.set(initialized, true);
        yield* Ref.set(wasmExportsRef, initializedCompiler.wasmExports);
        wasmExportsRuntime = initializedCompiler.wasmExports;
        yield* Ref.set(compileRef, initializedCompiler.compile);
        yield* Ref.set(compilerRef, initializedCompiler.compiler);
        yield* Deferred.succeed(readyDeferred, undefined);
      });

    const takeExternref = (wasmExports: InitOutput, idx: number): unknown => {
      const value = wasmExports.__wbindgen_externrefs.get(idx);
      wasmExports.__externref_table_dealloc(idx);
      return value;
    };

    const dispose = Effect.gen(function* () {
      yield* Ref.set(disposed, true);
      const compiler = yield* Ref.get(compilerRef);
      if (compiler) {
        yield* Effect.sync(() => compiler.free());
      }
      yield* Ref.set(compilerRef, null);
      yield* Ref.set(compileRef, null);
      yield* Ref.set(wasmExportsRef, null);
      wasmExportsRuntime = null;
    });

    return {
      ready: Deferred.await(readyDeferred),
      init: initDirect,
      dispose,
      addFont: (data: Uint8Array) => ensureCompiler((compiler) => void compiler.add_font(data), "add_font"),
      addFile: (path: string, data: Uint8Array) => ensureCompiler((compiler) => void compiler.add_file(path, data), "add_file"),
      addSource: (path: string, text: string) => ensureCompiler((compiler) => void compiler.add_source(path, text), "add_source"),
      removeFile: (path: string) => ensureCompiler((compiler) => void compiler.remove_file(path), "remove_file"),
      clearFiles: ensureCompiler((compiler) => void compiler.clear_files(), "clear_files"),
      listFiles: ensureCompiler((compiler) => compiler.list_files(), "list_files"),
      hasFile: (path: string) => ensureCompiler((compiler) => compiler.has_file(path), "has_file"),
      setMain: (path: string) => ensureCompiler((compiler) => void compiler.set_main(path), "set_main"),
      compile: () =>
        Effect.gen(function* () {
          const compiler = yield* Ref.get(compilerRef);
          const wasmExports = yield* Ref.get(wasmExportsRef);
          const compile = yield* Ref.get(compileRef);

          if (!compiler || !wasmExports || !compile) {
            return yield* Effect.fail(new DirectServiceError({ message: "Compiler not initialized" }));
          }

          const ret = yield* Effect.tryPromise({
            try: () => compile(compiler.__wbg_ptr),
            catch: (cause) => new DirectServiceError({ message: "Direct command failed: compile", cause }),
          });

          if (ret[2]) {
            throw takeExternref(wasmExports, ret[1]);
          }

          const result = takeExternref(wasmExports, ret[0]) as { svg?: string | null; diagnostics: WasmDiagnostic[] };
          return {
            svg: result.svg ?? "",
            diagnostics: result.diagnostics,
          };
        }),
    };
  }),
  dependencies: [PackageManager.Default],
}) {}
