import {
  CompilerDisposedError,
  FileNotFoundError,
  FetchError,
  PackageFetchError,
  CompilerNotInitializedError,
  WorkerError,
} from "../errors";
import type { FileLoaderManager } from "../files/loaders";
import type { FontInput } from "../compiler/types";
import type {
  EngineCompileOptions,
  EngineCompileSuccess,
  EngineCompiler,
  EngineCoreModuleLoader,
  EngineHost,
  EngineModule,
} from "../engine/types";

const toFetchError = (error: unknown): never => {
  if (error instanceof FileNotFoundError) throw { tag: "not-found" };
  if (error instanceof FetchError || error instanceof PackageFetchError) {
    throw { tag: "other", val: error.message };
  }
  throw {
    tag: "other",
    val: error instanceof Error ? error.message : String(error),
  };
};

export class DirectService {
  private disposed = false;
  private initPromise: Promise<void> | null = null;
  private compiler: EngineCompiler | null = null;
  private compileAsync:
    | ((options: EngineCompileOptions) => Promise<EngineCompileSuccess>)
    | null = null;

  constructor(
    private readonly fileLoaderManager: FileLoaderManager,
    private readonly engine: EngineModule,
    private readonly getCoreModule?: EngineCoreModuleLoader,
  ) {}

  async init(): Promise<void> {
    this.assertNotDisposed();
    this.initPromise ??= this.initDirect();
    try {
      await this.initPromise;
    } catch (error) {
      this.initPromise = null;
      throw error;
    }
  }

  async dispose(): Promise<void> {
    this.disposed = true;
    this.compiler = null;
    this.compileAsync = null;
  }

  async addFonts(...fonts: FontInput[]): Promise<void> {
    this.assertNotDisposed();
    const data = await Promise.all(fonts);
    this.withCompiler((compiler) => {
      for (const font of data) compiler.addFont(font);
    }, "add-fonts");
  }

  async addFile(path: string, data: Uint8Array): Promise<void> {
    this.withCompiler(
      (compiler) => void compiler.addFile(path, data),
      "add-file",
    );
  }

  async addSource(path: string, text: string): Promise<void> {
    this.withCompiler(
      (compiler) => void compiler.addSource(path, text),
      "add-source",
    );
  }

  async removeFile(path: string): Promise<void> {
    this.withCompiler(
      (compiler) => void compiler.removeFile(path),
      "remove-file",
    );
  }

  async clearFiles(): Promise<void> {
    this.withCompiler((compiler) => void compiler.clearFiles(), "clear-files");
  }

  async listFiles(): Promise<string[]> {
    return this.withCompiler((compiler) => compiler.listFiles(), "list-files");
  }

  async hasFile(path: string): Promise<boolean> {
    return this.withCompiler((compiler) => compiler.hasFile(path), "has-file");
  }

  async setMain(path: string): Promise<void> {
    this.withCompiler((compiler) => void compiler.setMain(path), "set-main");
  }

  async compile(options: EngineCompileOptions): Promise<EngineCompileSuccess> {
    this.assertNotDisposed();
    const compile = this.compileAsync;
    if (!compile)
      throw new CompilerNotInitializedError("Compiler not initialized");

    try {
      return await compile(options);
    } catch (cause) {
      throw new WorkerError("Direct command failed: compile", { cause });
    }
  }

  private async initDirect(): Promise<void> {
    const host: EngineHost = {
      fetch: async (request) => {
        try {
          return await this.fileLoaderManager.load(request);
        } catch (error) {
          return toFetchError(error);
        }
      },
      today: () => undefined,
    };

    const root = await this.engine.instantiate(this.getCoreModule, {
      "typst:engine/host": host,
    });
    this.compiler = new root.api.Compiler();
    this.compileAsync = async (options) =>
      await this.compiler!.compile(options);
  }

  private withCompiler<T>(
    run: (compiler: EngineCompiler) => T,
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
}
