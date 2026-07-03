import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  CompileError,
  createTypstCompiler,
  loadDefaultFonts,
  type defaultFonts,
  type PackageCache,
  type TypstCompiler,
  type TypstCompilerOptions,
  type TypstDocumentMetadata,
  type TypstFileLoader,
  type TypstLoadedFile,
  type WasmDiagnostic,
} from "typst-wasm";
import wasmUrl from "typst-wasm/wasm";
import type { Plugin, ResolvedConfig } from "vite";
import { transformHtmlAssets } from "./html-assets";

export interface TypstPluginOptions {
  loadWasmBytes?: TypstCompilerOptions["loadWasmBytes"];
  backend?: TypstCompilerOptions["backend"];
  packageBaseUrl?: string;
  packageCache?: PackageCache;
  memoryPackageCacheCapacity?: number;
  fileLoaders?: TypstFileLoader[];
  includeDefaultFonts?: boolean;
}

export interface TypstCompiledModule {
  html: string;
  metadata: TypstDocumentMetadata | undefined;
  diagnostics: WasmDiagnostic[];
  dependencies: TypstLoadedFile[];
}

const typstRequestRE = /\.typ(?:$|\?)/;

const normalizePath = (value: string): string =>
  value.replaceAll(path.sep, "/");

const cleanId = (id: string): string => id.replace(/[?#].*$/, "");

const toTypstProjectPath = (root: string, id: string): string =>
  normalizePath(path.relative(root, cleanId(id)));

const isInsideRoot = (root: string, file: string): boolean => {
  const relative = path.relative(root, file);
  return (
    relative === "" ||
    (!relative.startsWith("..") && !path.isAbsolute(relative))
  );
};

const makeProjectFileLoader = (root: string): TypstFileLoader => ({
  async load(request) {
    if (request.kind !== "project") return null;

    const file = path.resolve(root, request.path);
    if (!isInsideRoot(root, file)) return null;

    return {
      data: new Uint8Array(await readFile(file)),
      resolvedPath: file,
    };
  },
});

const loadConfiguredWasmBytes = (options: TypstPluginOptions) =>
  options.loadWasmBytes ??
  (async () => new Uint8Array(await readFile(wasmUrl)));

const loadConfiguredFontBytes = async (
  font: (typeof defaultFonts)[number],
): Promise<Uint8Array> => {
  const fontsEntry = import.meta.resolve("@typst-wasm/fonts");
  return new Uint8Array(
    await readFile(new URL(`./dist/files/${font.filename}`, fontsEntry)),
  );
};

const serialize = (value: unknown): string => JSON.stringify(value);

const formatCompileError = (error: CompileError): Error => {
  const diagnostics = error.diagnostics
    .map((diagnostic) => diagnostic.formatted || diagnostic.message)
    .join("\n\n");
  const message = diagnostics
    ? `${error.message}\n\n${diagnostics}`
    : error.message;

  return new Error(message, { cause: error });
};

const buildModuleCode = (
  compiled: TypstCompiledModule,
  htmlExpression: string,
  imports: string[],
): string => `${imports.join("\n")}
const html = ${htmlExpression};
const metadata = ${serialize(compiled.metadata)};
const diagnostics = ${serialize(compiled.diagnostics)};
const dependencies = ${serialize(compiled.dependencies)};
const document = { html, metadata, diagnostics, dependencies };
export { html, metadata, diagnostics, dependencies };
export default document;
`;

const compileTypst = async (
  compiler: TypstCompiler,
  source: string,
  id: string,
  root: string,
): Promise<TypstCompiledModule> => {
  const main = toTypstProjectPath(root, id);

  await compiler.addSource(main, source);
  const result = await compiler
    .compile({ main, format: "html" })
    .catch((error) => {
      if (error instanceof CompileError) {
        throw formatCompileError(error);
      }

      throw error;
    });
  if (result.format !== "html") {
    throw new Error(`Expected Typst HTML output, received ${result.format}`);
  }

  return {
    html: result.output,
    metadata: result.metadata,
    diagnostics: result.diagnostics,
    dependencies: result.dependencies ?? [],
  };
};

export const typst = (options: TypstPluginOptions = {}): Plugin => {
  let config: ResolvedConfig | undefined;
  let compilerPromise: Promise<TypstCompiler> | undefined;
  let transformQueue: Promise<void> = Promise.resolve();
  const watchedProjectFiles = new Set<string>();

  const disposeCompiler = async (): Promise<void> => {
    const compiler = await compilerPromise?.catch(() => undefined);
    compilerPromise = undefined;
    await compiler?.dispose().catch(() => undefined);
  };

  const getCompiler = (): Promise<TypstCompiler> => {
    if (!config) {
      throw new Error("vite-plugin-typst used before config resolution");
    }

    compilerPromise ??= (async () => {
      const compiler = await createTypstCompiler({
        loadWasmBytes: loadConfiguredWasmBytes(options),
        backend: options.backend,
        fileLoaders: [
          ...(options.fileLoaders ?? []),
          makeProjectFileLoader(config.root),
        ],
        packageBaseUrl: options.packageBaseUrl,
        packageCache: options.packageCache,
        memoryPackageCacheCapacity: options.memoryPackageCacheCapacity,
      });

      if (options.includeDefaultFonts !== false) {
        await loadDefaultFonts(compiler, loadConfiguredFontBytes);
      }

      return compiler;
    })().catch((error) => {
      compilerPromise = undefined;
      throw error;
    });

    return compilerPromise;
  };

  const runWithCompiler = async <T>(
    task: (compiler: TypstCompiler) => Promise<T>,
  ) => {
    const run = transformQueue.then(async () => task(await getCompiler()));
    transformQueue = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  };

  const invalidateProjectFile = async (id: string): Promise<void> => {
    if (!config || !compilerPromise || !isInsideRoot(config.root, id)) return;
    const projectPath = toTypstProjectPath(config.root, id);
    await runWithCompiler((compiler) => compiler.removeFile(projectPath));
  };

  return {
    name: "vite-plugin-typst",

    configResolved(resolvedConfig) {
      config = resolvedConfig;
    },

    configureServer(server) {
      server.watcher.on("change", (id) => {
        void invalidateProjectFile(id);
      });
      server.watcher.on("unlink", (id) => {
        void invalidateProjectFile(id);
      });
      server.httpServer?.once("close", () => {
        void disposeCompiler();
      });
    },

    async watchChange(id) {
      await invalidateProjectFile(id);
    },

    async transform(code, id) {
      if (!typstRequestRE.test(id)) return undefined;
      if (!config) {
        this.error(
          new Error("vite-plugin-typst used before config resolution"),
        );
      }

      const root = config.root;
      const compiled = await runWithCompiler((compiler) =>
        compileTypst(compiler, code, id, root),
      );
      for (const dependency of compiled.dependencies) {
        if (dependency.kind === "project" && dependency.resolvedPath) {
          watchedProjectFiles.add(dependency.resolvedPath);
        }
      }
      for (const file of watchedProjectFiles) {
        this.addWatchFile(file);
      }

      const { imports, htmlExpression } = transformHtmlAssets(compiled.html);
      return {
        code: buildModuleCode(compiled, htmlExpression, imports),
        map: { mappings: "" },
      };
    },

    async closeBundle() {
      await disposeCompiler();
    },
  };
};

export default typst;

export type {
  TypstDocumentMetadata,
  TypstFileLoader,
  TypstLoadedFile,
  WasmDiagnostic,
};
