import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  createTypstCompiler,
  defaultFonts,
  type PackageCache,
  type TypstCompilerOptions,
  type TypstDocumentMetadata,
  type TypstFileLoader,
  type TypstLoadedFile,
  type WasmDiagnostic,
} from "typst-wasm";
import wasmUrl from "typst-wasm/wasm";
import { transformHtmlAssets } from "./html-assets";

export interface TypstPluginOptions {
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

interface ResolvedConfig {
  root: string;
}

interface TransformResult {
  code: string;
  map: { mappings: "" };
}

interface PluginContext {
  addWatchFile(id: string): void;
  error(error: Error): never;
}

interface VitePlugin {
  name: string;
  enforce?: "pre" | "post";
  configResolved(config: ResolvedConfig): void;
  transform(
    this: PluginContext,
    code: string,
    id: string,
  ): Promise<TransformResult | undefined>;
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

const addDefaultFonts = async (
  compiler: Awaited<ReturnType<typeof createTypstCompiler>>,
): Promise<void> => {
  const fonts = await Promise.all(defaultFonts.map((font) => font.load()));
  await Promise.all(fonts.map((font) => compiler.addFont(font)));
};

const serialize = (value: unknown): string => JSON.stringify(value);

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
  source: string,
  id: string,
  root: string,
  options: TypstPluginOptions,
): Promise<TypstCompiledModule> => {
  const main = toTypstProjectPath(root, id);
  const compiler = await createTypstCompiler({
    moduleOrPath: wasmUrl,
    backend: options.backend,
    fileLoaders: [...(options.fileLoaders ?? []), makeProjectFileLoader(root)],
    packageBaseUrl: options.packageBaseUrl,
    packageCache: options.packageCache,
    memoryPackageCacheCapacity: options.memoryPackageCacheCapacity,
  });

  try {
    if (options.includeDefaultFonts !== false) {
      await addDefaultFonts(compiler);
    }

    await compiler.addSource(main, source);
    const result = await compiler.compile({ main, format: "html" });
    if (result.format !== "html") {
      throw new Error(`Expected Typst HTML output, received ${result.format}`);
    }

    return {
      html: result.output,
      metadata: result.metadata,
      diagnostics: result.diagnostics,
      dependencies: result.dependencies ?? [],
    };
  } finally {
    await compiler.dispose();
  }
};

export const typst = (options: TypstPluginOptions = {}): VitePlugin => {
  let config: ResolvedConfig | undefined;

  return {
    name: "vite-plugin-typst",

    configResolved(resolvedConfig) {
      config = resolvedConfig;
    },

    async transform(code, id) {
      if (!typstRequestRE.test(id)) return undefined;
      if (!config) {
        this.error(
          new Error("vite-plugin-typst used before config resolution"),
        );
      }

      const compiled = await compileTypst(code, id, config.root, options);
      for (const dependency of compiled.dependencies) {
        if (dependency.kind === "project" && dependency.resolvedPath) {
          this.addWatchFile(dependency.resolvedPath);
        }
      }

      const { imports, htmlExpression } = transformHtmlAssets(compiled.html);
      return {
        code: buildModuleCode(compiled, htmlExpression, imports),
        map: { mappings: "" },
      };
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
