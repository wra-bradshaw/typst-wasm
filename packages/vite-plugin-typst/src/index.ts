import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  CompileError,
  createTypstCompiler,
  type PackageCache,
  type TypstCompiler,
  type TypstCompilerOptions,
  type DocumentMetadata,
  type TypstFileLoader,
  type LoadedFile,
  type Diagnostic,
  type TypstDiagnostic,
  type TypstDocumentMetadata,
  type TypstLoadedFile,
} from "typst-wasm/node";
import type { Plugin, ResolvedConfig } from "vite";
import { transformHtmlAssets } from "./html-assets";

/** Options for the Vite Typst transformation plugin. */
export interface TypstPluginOptions {
  /** Backend passed to the compiler. */
  backend?: TypstCompilerOptions["backend"];
  /** JCO-generated engine module for JSPI. */
  engine?: TypstCompilerOptions["engine"];
  /** Optional loader for precompiled core WASM modules. */
  getCoreModule?: TypstCompilerOptions["getCoreModule"];
  /** Worker factory passed to the compiler. */
  worker?: TypstCompilerOptions["worker"];
  /** Base URL used for Typst package downloads. */
  packageBaseUrl?: string;
  /** Cache used for downloaded packages. */
  packageCache?: PackageCache;
  /** Capacity of the in-memory package cache. */
  memoryPackageCacheCapacity?: number;
  /** Additional file loaders. */
  fileLoaders?: TypstFileLoader[];
  /** Configures the compiler after it has been created. */
  configureCompiler?: (compiler: TypstCompiler) => Promise<void> | void;
}

/** Values exported by a compiled `.typ` module. */
export interface TypstCompiledModule {
  html: string;
  metadata: DocumentMetadata | undefined;
  diagnostics: Diagnostic[];
  dependencies: LoadedFile[];
}

type TypstRequestMode = "html";

const classifyTypstRequest = (id: string): TypstRequestMode | undefined => {
  if (!id.includes(".typ")) return undefined;

  const queryStart = id.indexOf("?");
  if (queryStart === -1) return undefined;
  if (!id.slice(0, queryStart).endsWith(".typ")) return undefined;
  const queryEnd = id.indexOf("#", queryStart);
  const query = id.slice(
    queryStart + 1,
    queryEnd === -1 ? undefined : queryEnd,
  );
  const params = new URLSearchParams(query);
  const modes = params.getAll("typst");

  if (modes.length === 0) return undefined;
  if (modes.length !== 1) {
    throw new Error(
      "vite-plugin-typst accepts exactly one `typst` query parameter",
    );
  }
  if (params.has("raw") || params.has("url")) {
    throw new Error(
      "vite-plugin-typst cannot combine `typst` with `raw` or `url`",
    );
  }
  if (modes[0] !== "html") {
    throw new Error(
      `vite-plugin-typst does not support \`typst=${modes[0]}\`; only \`typst=html\` is currently available`,
    );
  }

  return "html";
};

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

const makeProjectFileLoader =
  (root: string): TypstFileLoader =>
  async (request) => {
    if (request.kind !== "project") return null;
    const file = path.resolve(root, request.path);
    if (!isInsideRoot(root, file)) return null;
    return { data: new Uint8Array(await readFile(file)), resolvedPath: file };
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
  return {
    html: result.output,
    metadata: result.metadata,
    diagnostics: result.diagnostics,
    dependencies: result.dependencies,
  };
};

/**
 * Adds `.typ` source transformation to a Vite project.
 *
 * The transformed module exports the rendered HTML, metadata, diagnostics,
 * and dependencies, and uses the document as its default export.
 */
export const typst = (options: TypstPluginOptions): Plugin => {
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
        backend: options.backend,
        engine: options.engine,
        getCoreModule: options.getCoreModule,
        worker: options.worker,
        fileLoaders: [
          ...(options.fileLoaders ?? []),
          makeProjectFileLoader(config.root),
        ],
        packageBaseUrl: options.packageBaseUrl,
        packageCache: options.packageCache,
        memoryPackageCacheCapacity: options.memoryPackageCacheCapacity,
      });

      await options.configureCompiler?.(compiler);

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
      let mode: TypstRequestMode | undefined;
      try {
        mode = classifyTypstRequest(id);
      } catch (error) {
        this.error(error instanceof Error ? error : new Error(String(error)));
      }
      if (mode === undefined) return undefined;
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
  Diagnostic,
  DocumentMetadata,
  LoadedFile,
  TypstDiagnostic,
  TypstDocumentMetadata,
  TypstFileLoader,
  TypstLoadedFile,
};
