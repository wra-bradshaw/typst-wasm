import path from "node:path";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { Plugin, ResolvedConfig } from "vite";
import typst from "./index";
import type {
  CompileOptions,
  CompileResult,
  TypstCompiler,
  TypstCompilerOptions,
  TypstLoadedFile,
} from "typst-wasm";

const typstWasm = vi.hoisted(() => {
  class MockCompileError extends Error {
    diagnostics: unknown[];

    constructor(message: string, options?: { diagnostics?: unknown[] }) {
      super(message);
      this.diagnostics = options?.diagnostics ?? [];
    }
  }

  return {
    CompileError: MockCompileError,
    createTypstCompiler: vi.fn(),
    defaultFonts: [],
  };
});

vi.mock("typst-wasm", () => typstWasm);
vi.mock("typst-wasm/wasm", () => ({ default: "/typst.wasm" }));

const projectRoot = path.resolve("/project");

const makeConfig = (): ResolvedConfig =>
  ({
    root: projectRoot,
  }) as ResolvedConfig;

interface TestTransformContext {
  addWatchFile(file: string): void;
  error(error: Error): never;
}

interface TestPluginHooks {
  configResolved(config: ResolvedConfig): void;
  transform(
    this: TestTransformContext,
    source: string,
    id: string,
  ): Promise<unknown>;
  watchChange?(
    this: TestTransformContext,
    id: string,
    change: { event: "create" | "update" | "delete" },
  ): Promise<void>;
  closeBundle?(): Promise<void>;
}

const makeTransformContext = () => {
  const watchedFiles: string[] = [];
  const context = {
    addWatchFile(file: string) {
      watchedFiles.push(file);
    },
    error(error: Error): never {
      throw error;
    },
  } satisfies TestTransformContext;

  return { context, watchedFiles };
};

const makeCompiler = (dependencies: TypstLoadedFile[] = []) => {
  const sources = new Map<string, string>();
  const compiler = {
    addFont: vi.fn(async () => undefined),
    addFile: vi.fn(async () => undefined),
    addSource: vi.fn(async (file: string, source: string) => {
      sources.set(file, source);
    }),
    removeFile: vi.fn(async (file: string) => {
      sources.delete(file);
    }),
    clearFiles: vi.fn(async () => undefined),
    listFiles: vi.fn(async () => [...sources.keys()]),
    hasFile: vi.fn(async (file: string) => sources.has(file)),
    setMain: vi.fn(async () => undefined),
    compile: vi.fn(async (options?: CompileOptions) => {
      const main = options?.main ?? "";
      return {
        format: "html",
        output: `<p>${sources.get(main) ?? ""}</p>`,
        diagnostics: [],
        dependencies,
      } satisfies CompileResult;
    }),
    dispose: vi.fn(async () => undefined),
  } satisfies TypstCompiler;

  return compiler;
};

const resolvePlugin = (plugin: Plugin): TestPluginHooks => {
  const hooks = plugin as unknown as TestPluginHooks;
  hooks.configResolved(makeConfig());
  return hooks;
};

const transformTypst = async (
  plugin: TestPluginHooks,
  context: TestTransformContext,
  source: string,
  id: string,
) => {
  return await plugin.transform.call(context, source, id);
};

describe("typst vite plugin compiler lifecycle", () => {
  beforeEach(() => {
    typstWasm.createTypstCompiler.mockReset();
  });

  test("reuses one compiler for multiple Typst entry modules", async () => {
    const compiler = makeCompiler();
    typstWasm.createTypstCompiler.mockResolvedValue(compiler);
    const plugin = resolvePlugin(typst({ includeDefaultFonts: false }));
    const { context } = makeTransformContext();

    await transformTypst(
      plugin,
      context,
      "= One",
      path.join(projectRoot, "one.typ"),
    );
    await transformTypst(
      plugin,
      context,
      "= Two",
      path.join(projectRoot, "two.typ"),
    );

    expect(typstWasm.createTypstCompiler).toHaveBeenCalledTimes(1);
    expect(typstWasm.createTypstCompiler).toHaveBeenCalledWith(
      expect.objectContaining({
        backend: undefined,
        fileLoaders: expect.any(Array) as TypstCompilerOptions["fileLoaders"],
        wasmURL: "/typst.wasm",
      }),
    );
    expect(compiler.addSource).toHaveBeenNthCalledWith(1, "one.typ", "= One");
    expect(compiler.addSource).toHaveBeenNthCalledWith(2, "two.typ", "= Two");
    expect(compiler.compile).toHaveBeenNthCalledWith(1, {
      main: "one.typ",
      format: "html",
    });
    expect(compiler.compile).toHaveBeenNthCalledWith(2, {
      main: "two.typ",
      format: "html",
    });
  });

  test("removes changed project files from the shared compiler cache", async () => {
    const dependencyPath = path.join(projectRoot, "shared.typ");
    const compiler = makeCompiler([
      {
        kind: "project",
        path: "shared.typ",
        resolvedPath: dependencyPath,
      },
    ]);
    typstWasm.createTypstCompiler.mockResolvedValue(compiler);
    const plugin = resolvePlugin(typst({ includeDefaultFonts: false }));
    const { context, watchedFiles } = makeTransformContext();

    await transformTypst(
      plugin,
      context,
      '#import "shared.typ": message',
      path.join(projectRoot, "main.typ"),
    );
    await plugin.watchChange?.call(context, dependencyPath, {
      event: "update",
    });

    expect(watchedFiles).toContain(dependencyPath);
    expect(compiler.removeFile).toHaveBeenCalledWith("shared.typ");
  });

  test("disposes the shared compiler when the plugin closes", async () => {
    const compiler = makeCompiler();
    typstWasm.createTypstCompiler.mockResolvedValue(compiler);
    const plugin = resolvePlugin(typst({ includeDefaultFonts: false }));
    const { context } = makeTransformContext();

    await transformTypst(
      plugin,
      context,
      "= Disposable",
      path.join(projectRoot, "main.typ"),
    );
    await plugin.closeBundle?.();

    expect(compiler.dispose).toHaveBeenCalledTimes(1);
  });
});
