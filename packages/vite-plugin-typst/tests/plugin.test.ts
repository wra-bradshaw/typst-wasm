import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { TypstCompiledModule } from "../src";

const compilerState = {
  addFont: vi.fn(),
  addSource: vi.fn(),
  compile: vi.fn(),
  dispose: vi.fn(),
};

interface MockCompilerOptions {
  fileLoaders?: Array<{
    load(request: { path: string; kind: string }): Promise<unknown>;
  }>;
}

const createTypstCompiler = vi.fn(
  async (_options: MockCompilerOptions) => compilerState,
);

vi.mock("typst-wasm", () => ({
  createTypstCompiler,
  defaultFonts: [{ load: async () => new Uint8Array([1, 2, 3]) }],
}));

vi.mock("typst-wasm/wasm", () => ({
  default: new URL("file:///typst_wasm_bg.wasm"),
}));

const readModule = async (code: string): Promise<TypstCompiledModule> => {
  const dir = await mkdtemp(join(tmpdir(), "typst-plugin-test-"));
  const file = join(dir, "module.mjs");
  await writeFile(file, code, "utf8");
  try {
    const mod = (await import(`${file}?t=${Date.now()}`)) as {
      default: TypstCompiledModule;
    };
    return mod.default;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
};

describe("vite-plugin-typst", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("compiles typ files to JS modules", async () => {
    compilerState.compile.mockResolvedValue({
      format: "html",
      output: "<h1>Hello</h1>",
      metadata: {
        title: "Hello",
        author: [],
        keywords: [],
        custom: [{ label: "kind", value: { type: "demo" } }],
      },
      diagnostics: [],
      dependencies: [],
    });

    const { default: typst } = await import("../src");
    const plugin = typst();
    plugin.configResolved({ root: "/project" });
    const result = await plugin.transform.call(
      {
        addWatchFile: vi.fn(),
        error: (error) => {
          throw error;
        },
      },
      "= Hello",
      "/project/src/doc.typ",
    );

    expect(result?.code).toContain("const html =");
    expect(compilerState.addFont).toHaveBeenCalledWith(
      new Uint8Array([1, 2, 3]),
    );
    expect(compilerState.addSource).toHaveBeenCalledWith(
      "src/doc.typ",
      "= Hello",
    );

    const document = await readModule(result?.code ?? "");
    expect(document.html).toBe("<h1>Hello</h1>");
    expect(document.metadata?.title).toBe("Hello");
    expect(document.metadata?.custom[0]?.value).toEqual({ type: "demo" });
  });

  it("adds project dependencies as watch files", async () => {
    compilerState.compile.mockResolvedValue({
      format: "html",
      output: "<p>Watched</p>",
      metadata: undefined,
      diagnostics: [],
      dependencies: [
        {
          path: "src/chapter.typ",
          kind: "project",
          resolvedPath: "/project/src/chapter.typ",
        },
        {
          path: "@preview/pkg:0.1.0/lib.typ",
          kind: "package",
          resolvedPath: "@preview/pkg:0.1.0/lib.typ",
        },
      ],
    });

    const addWatchFile = vi.fn();
    const { default: typst } = await import("../src");
    const plugin = typst({ includeDefaultFonts: false });
    plugin.configResolved({ root: "/project" });

    await plugin.transform.call(
      {
        addWatchFile,
        error: (error) => {
          throw error;
        },
      },
      "= Watched",
      "/project/src/doc.typ",
    );

    expect(addWatchFile).toHaveBeenCalledWith("/project/src/chapter.typ");
    expect(addWatchFile).not.toHaveBeenCalledWith("@preview/pkg:0.1.0/lib.typ");
    expect(compilerState.addFont).not.toHaveBeenCalled();
  });

  it("project loader passes non-project requests and reads project files", async () => {
    const dir = await mkdtemp(join(tmpdir(), "typst-plugin-loader-"));
    try {
      await writeFile(join(dir, "asset.txt"), "asset", "utf8");
      compilerState.compile.mockImplementationOnce(async () => {
        const options = createTypstCompiler.mock.calls[0]?.[0];
        const projectLoader = options?.fileLoaders?.at(-1);

        expect(
          await projectLoader?.load({
            path: "@preview/pkg:0.1.0/lib.typ",
            kind: "package",
          }),
        ).toBeNull();

        const loaded = (await projectLoader?.load({
          path: "asset.txt",
          kind: "project",
        })) as { data: Uint8Array; resolvedPath: string };

        expect(Buffer.from(loaded.data).toString("utf8")).toBe("asset");
        expect(loaded.resolvedPath).toBe(join(dir, "asset.txt"));

        return {
          format: "html",
          output: "<p>Loaded</p>",
          metadata: undefined,
          diagnostics: [],
          dependencies: [],
        };
      });

      const { default: typst } = await import("../src");
      const plugin = typst({ includeDefaultFonts: false });
      plugin.configResolved({ root: dir });
      await plugin.transform.call(
        {
          addWatchFile: vi.fn(),
          error: (error) => {
            throw error;
          },
        },
        "= Loaded",
        join(dir, "doc.typ"),
      );

      expect(await readFile(join(dir, "asset.txt"), "utf8")).toBe("asset");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("places custom loaders before the Vite project loader", async () => {
    compilerState.compile.mockResolvedValue({
      format: "html",
      output: "<p>Ordered</p>",
      metadata: undefined,
      diagnostics: [],
      dependencies: [],
    });

    const customLoader = { load: vi.fn() };
    const { default: typst } = await import("../src");
    const plugin = typst({
      fileLoaders: [customLoader],
      includeDefaultFonts: false,
    });
    plugin.configResolved({ root: "/project" });

    await plugin.transform.call(
      {
        addWatchFile: vi.fn(),
        error: (error) => {
          throw error;
        },
      },
      "= Ordered",
      "/project/src/doc.typ",
    );

    const options = createTypstCompiler.mock.calls[0]?.[0];
    expect(options?.fileLoaders?.[0]).toBe(customLoader);
    expect(options?.fileLoaders).toHaveLength(2);
  });
});
