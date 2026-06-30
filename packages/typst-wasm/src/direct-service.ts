import {
  registerHostFetch,
  unregisterHostFetch,
} from "@typst-wasm/engine-wasm/bridge";
import { supportsJspiBackend } from "./backend-support";
import {
  CompilerDisposedError,
  CompilerNotInitializedError,
  WorkerError,
} from "./errors";
import type { FileLoaderManager } from "./file-loader";
import type { WasmModuleOrPath } from "./wasm-module";
import {
  loadWasmModule,
  type InitOutput,
  type TypstCompilerInstance,
  type WasmCompileOptions,
  type WasmCompileOutput,
} from "./wasm";
import { getJspiWebAssembly } from "./webassembly-jspi";

const MAX_FETCH_ATTEMPTS = 3;
const textDecoder = new TextDecoder();
let nextHostId = 1;

type WasmBindgenPointer = {
  readonly __wbg_ptr: number;
};

const retry = async <T>(
  task: () => Promise<T>,
  maxAttempts: number,
): Promise<T> => {
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

export class DirectService {
  private disposed = false;
  private initPromise: Promise<void> | null = null;
  private compiler: TypstCompilerInstance | null = null;
  private wasmExports: InitOutput | null = null;
  private readonly hostId = nextHostId++;
  private compileAsync:
    | ((
        compilerPtr: number,
        options: WasmCompileOptions,
      ) => Promise<[number, number, number]>)
    | null = null;

  constructor(private readonly fileLoaderManager: FileLoaderManager) {}

  async init(moduleOrPath: WasmModuleOrPath): Promise<void> {
    this.assertNotDisposed();
    this.initPromise ??= this.initDirect(moduleOrPath);
    await this.initPromise;
  }

  async dispose(): Promise<void> {
    this.disposed = true;
    if (this.compiler) {
      this.compiler.free();
    }
    this.compiler = null;
    this.wasmExports = null;
    this.compileAsync = null;
    unregisterHostFetch(this.hostId);
  }

  async addFont(data: Uint8Array): Promise<void> {
    this.withCompiler((compiler) => void compiler.add_font(data), "add_font");
  }

  async addFile(path: string, data: Uint8Array): Promise<void> {
    this.withCompiler(
      (compiler) => void compiler.add_file(path, data),
      "add_file",
    );
  }

  async addSource(path: string, text: string): Promise<void> {
    this.withCompiler(
      (compiler) => void compiler.add_source(path, text),
      "add_source",
    );
  }

  async removeFile(path: string): Promise<void> {
    this.withCompiler(
      (compiler) => void compiler.remove_file(path),
      "remove_file",
    );
  }

  async clearFiles(): Promise<void> {
    this.withCompiler((compiler) => void compiler.clear_files(), "clear_files");
  }

  async listFiles(): Promise<string[]> {
    return this.withCompiler((compiler) => compiler.list_files(), "list_files");
  }

  async hasFile(path: string): Promise<boolean> {
    return this.withCompiler((compiler) => compiler.has_file(path), "has_file");
  }

  async setMain(path: string): Promise<void> {
    this.withCompiler((compiler) => void compiler.set_main(path), "set_main");
  }

  async compile(options: WasmCompileOptions): Promise<WasmCompileOutput> {
    this.assertNotDisposed();
    const compiler = this.compiler;
    const wasmExports = this.wasmExports;
    const compile = this.compileAsync;

    if (!compiler || !wasmExports || !compile) {
      throw new CompilerNotInitializedError("Compiler not initialized");
    }

    let ret: [number, number, number];
    try {
      ret = await compile(this.compilerPointer(compiler), options);
    } catch (cause) {
      throw new WorkerError("Direct command failed: compile", { cause });
    }

    if (ret[2]) {
      throw this.takeExternref(wasmExports, ret[1]);
    }

    return this.takeExternref(wasmExports, ret[0]) as WasmCompileOutput;
  }

  private async initDirect(moduleOrPath: WasmModuleOrPath): Promise<void> {
    if (!supportsJspiBackend()) {
      throw new WorkerError("JSPI is unavailable in this runtime");
    }

    const wasmModule = await loadWasmModule();
    const { Suspending, promising } = getJspiWebAssembly<WasmCompileOptions>();
    if (!Suspending || !promising) {
      throw new WorkerError("JSPI is unavailable in this runtime");
    }
    const suspending = new Suspending(this.hostFetch);
    registerHostFetch(this.hostId, suspending);

    void moduleOrPath;
    const wasmExports = wasmModule;

    this.wasmExports = wasmExports;
    this.compileAsync = promising(wasmExports.typstcompiler_compile);
    this.compiler = new wasmModule.TypstCompiler(this.hostId);
  }

  private readonly hostFetch = async (
    pathPtr: number,
    pathLen: number,
    resultLenPtr: number,
  ): Promise<number> => {
    const wasmExports = this.wasmExports;
    if (!wasmExports) {
      throw new Error("WASM exports not initialized");
    }

    const path = textDecoder.decode(
      new Uint8Array(wasmExports.memory.buffer, pathPtr, pathLen),
    );

    try {
      const bytes = await retry(
        () => this.fileLoaderManager.load(path),
        MAX_FETCH_ATTEMPTS,
      );
      const resultPtr = wasmExports.__wbindgen_malloc(bytes.length, 1);
      new Uint8Array(wasmExports.memory.buffer, resultPtr, bytes.length).set(
        bytes,
      );
      new DataView(wasmExports.memory.buffer).setUint32(
        resultLenPtr,
        bytes.length,
        true,
      );
      return resultPtr;
    } catch {
      new DataView(wasmExports.memory.buffer).setUint32(resultLenPtr, 0, true);
      return 0;
    }
  };

  private withCompiler<T>(
    run: (compiler: TypstCompilerInstance) => T,
    name: string,
  ): T {
    this.assertNotDisposed();
    if (!this.compiler) {
      throw new CompilerNotInitializedError("Compiler not initialized");
    }

    try {
      return run(this.compiler);
    } catch (cause) {
      throw new WorkerError(`Direct command failed: ${name}`, { cause });
    }
  }

  private assertNotDisposed(): void {
    if (this.disposed) {
      throw new CompilerDisposedError("Compiler has been disposed");
    }
  }

  private takeExternref(wasmExports: InitOutput, idx: number): unknown {
    const value = wasmExports.__wbindgen_externrefs.get(idx);
    wasmExports.__externref_table_dealloc(idx);
    return value;
  }

  private compilerPointer(compiler: TypstCompilerInstance): number {
    return (compiler as TypstCompilerInstance & WasmBindgenPointer).__wbg_ptr;
  }
}
