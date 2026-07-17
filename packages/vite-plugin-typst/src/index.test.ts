import path from "node:path";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { Plugin, ResolvedConfig } from "vite";
import typst from "./index";
import type {
  CompileOptions,
  HtmlCompileResult,
  TypstCompiler,
  TypstCompilerOptions,
  LoadedFile,
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
  };
});

vi.mock("typst-wasm", () => typstWasm);

const projectRoot = path.resolve("/project");
const worker = (() => ({
  listen: () => {},
  postMessage: () => {},
  terminate: () => {},
})) as TypstCompilerOptions["worker"];
const coreModules = {
  "engine.core.wasm": {} as WebAssembly.Module,
  "engine.core2.wasm": {} as WebAssembly.Module,
  "engine.core3.wasm": {} as WebAssembly.Module,
};

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

const makeCompiler = (dependencies: LoadedFile[] = []) => {
  const sources = new Map<string, string>();
  const compiler = {
    addFonts: vi.fn(async () => undefined),
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
    compile: vi.fn(async (options: CompileOptions) => {
      const main = options.main ?? "";
      return {
        format: "html",
        output: `<p>${sources.get(main) ?? ""}</p>`,
        diagnostics: [],
        dependencies,
      } satisfies HtmlCompileResult;
    }),
    dispose: vi.fn(async () => undefined),
  } satisfies Omit<TypstCompiler, "compile"> & {
    compile(options: CompileOptions<"html">): Promise<HtmlCompileResult>;
  };

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

describe("typst vite plugin request matching", () => {
  beforeEach(() => {
    typstWasm.createTypstCompiler.mockReset();
  });

  test("provides defaults when no options are supplied", async () => {
    const compiler = makeCompiler();
    typstWasm.createTypstCompiler.mockResolvedValue(compiler);
    const plugin = resolvePlugin(typst());
    const { context } = makeTransformContext();

    await transformTypst(
      plugin,
      context,
      "= Defaults",
      `${path.join(projectRoot, "defaults.typ")}?typst=html`,
    );

    const options = typstWasm.createTypstCompiler.mock.calls[0]?.[0] as
      | TypstCompilerOptions
      | undefined;
    expect(options?.coreModules).toEqual({
      "engine.core.wasm": expect.any(Promise),
      "engine.core2.wasm": expect.any(Promise),
      "engine.core3.wasm": expect.any(Promise),
    });
    expect(options?.worker).toEqual(expect.any(Function));
  });

  test("only transforms explicit html queries", async () => {
    const compiler = makeCompiler();
    typstWasm.createTypstCompiler.mockResolvedValue(compiler);
    const plugin = resolvePlugin(typst({ coreModules, worker }));
    const { context } = makeTransformContext();

    expect(
      await transformTypst(plugin, context, "source", "doc.typ"),
    ).toBeUndefined();
    expect(
      await transformTypst(plugin, context, "source", "doc.typ?raw"),
    ).toBeUndefined();
    expect(
      await transformTypst(
        plugin,
        context,
        "source",
        "doc.typ?foo=bar&typst=html",
      ),
    ).toMatchObject({ code: expect.stringContaining("const html =") });
  });

  test("rejects unsupported and ambiguous output queries", async () => {
    const plugin = resolvePlugin(typst({ coreModules, worker }));
    const { context } = makeTransformContext();

    await expect(
      transformTypst(plugin, context, "source", "doc.typ?typst=pdf"),
    ).rejects.toThrow("only `typst=html` is currently available");
    await expect(
      transformTypst(plugin, context, "source", "doc.typ?typst=html&raw"),
    ).rejects.toThrow("cannot combine");
  });
});

describe("typst vite plugin compiler lifecycle", () => {
  beforeEach(() => {
    typstWasm.createTypstCompiler.mockReset();
  });

  test("forwards compiler options", async () => {
    const compiler = makeCompiler();
    const fetch = vi.fn() as unknown as TypstCompilerOptions["fetch"];
    const logger = { log: vi.fn() } satisfies NonNullable<
      TypstCompilerOptions["logger"]
    >;
    typstWasm.createTypstCompiler.mockResolvedValue(compiler);
    const plugin = resolvePlugin(
      typst({
        coreModules,
        worker,
        fetch,
        logger,
        logLevel: "debug",
        packageCache: false,
      }),
    );
    const { context } = makeTransformContext();

    await transformTypst(
      plugin,
      context,
      "= Options",
      `${path.join(projectRoot, "options.typ")}?typst=html`,
    );

    expect(typstWasm.createTypstCompiler).toHaveBeenCalledWith(
      expect.objectContaining({
        fetch,
        logger,
        logLevel: "debug",
        packageCache: false,
      }),
    );
  });

  test("reuses one compiler for multiple Typst entry modules", async () => {
    const compiler = makeCompiler();
    typstWasm.createTypstCompiler.mockResolvedValue(compiler);
    const plugin = resolvePlugin(typst({ coreModules, worker }));
    const { context } = makeTransformContext();

    await transformTypst(
      plugin,
      context,
      "= One",
      `${path.join(projectRoot, "one.typ")}?typst=html`,
    );
    await transformTypst(
      plugin,
      context,
      "= Two",
      `${path.join(projectRoot, "two.typ")}?typst=html`,
    );

    expect(typstWasm.createTypstCompiler).toHaveBeenCalledTimes(1);
    expect(typstWasm.createTypstCompiler).toHaveBeenCalledWith(
      expect.objectContaining({
        backend: undefined,
        worker,
        fileLoaders: expect.any(Array) as TypstCompilerOptions["fileLoaders"],
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
    const plugin = resolvePlugin(typst({ coreModules, worker }));
    const { context, watchedFiles } = makeTransformContext();

    await transformTypst(
      plugin,
      context,
      '#import "shared.typ": message',
      `${path.join(projectRoot, "main.typ")}?typst=html`,
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
    const plugin = resolvePlugin(typst({ coreModules, worker }));
    const { context } = makeTransformContext();

    await transformTypst(
      plugin,
      context,
      "= Disposable",
      `${path.join(projectRoot, "main.typ")}?typst=html`,
    );
    await plugin.closeBundle?.();

    expect(compiler.dispose).toHaveBeenCalledTimes(1);
  });

  test("runs custom compiler setup once", async () => {
    const compiler = makeCompiler();
    const configureCompiler = vi.fn(async (configured: TypstCompiler) => {
      await configured.addFonts(new Uint8Array([1, 2, 3]));
    });
    typstWasm.createTypstCompiler.mockResolvedValue(compiler);
    const plugin = resolvePlugin(
      typst({ coreModules, worker, configureCompiler }),
    );
    const { context } = makeTransformContext();

    await transformTypst(
      plugin,
      context,
      "= Setup",
      `${path.join(projectRoot, "main.typ")}?typst=html`,
    );

    expect(configureCompiler).toHaveBeenCalledOnce();
    expect(configureCompiler).toHaveBeenCalledWith(compiler);
    expect(compiler.addFonts).toHaveBeenCalledWith(new Uint8Array([1, 2, 3]));
  });
});
