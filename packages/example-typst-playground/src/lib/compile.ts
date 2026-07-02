import {
  CompileError,
  createTypstCompiler,
  defaultFonts,
  type TypstCompiler,
  type WasmDiagnostic,
} from "typst-wasm";

export interface CompileView {
  html: string;
  diagnostics: WasmDiagnostic[];
}

let browserCompiler: Promise<TypstCompiler> | undefined;
let browserCompileQueue: Promise<void> = Promise.resolve();

const createInitializedCompiler = async (): Promise<TypstCompiler> => {
  const compiler = await createTypstCompiler({
    backend: "auto",
  });

  try {
    const fonts = await Promise.all(defaultFonts.map((font) => font.load()));
    await Promise.all(fonts.map((font) => compiler.addFont(font)));
    return compiler;
  } catch (error) {
    await compiler.dispose();
    throw error;
  }
};

const getBrowserCompiler = (): Promise<TypstCompiler> => {
  browserCompiler ??= createInitializedCompiler().catch((error: unknown) => {
    browserCompiler = undefined;
    throw error;
  });

  return browserCompiler;
};

const compileWithCompiler = async (
  compiler: TypstCompiler,
  source: string,
): Promise<CompileView> => {
  await compiler.addSource("main.typ", source);

  const result = await compiler.compile({
    main: "main.typ",
    format: "html",
  });

  if (result.format !== "html") {
    throw new Error(`Expected html output, received ${result.format}`);
  }

  return {
    html: result.output,
    diagnostics: result.diagnostics,
  };
};

const compileWithBrowserCompiler = (source: string): Promise<CompileView> => {
  const compile = browserCompileQueue.then(async () =>
    compileWithCompiler(await getBrowserCompiler(), source),
  );

  browserCompileQueue = compile.then(
    () => undefined,
    () => undefined,
  );

  return compile;
};

export const compileTypstHtml = async (source: string): Promise<CompileView> => {
  if (typeof window !== "undefined") {
    return compileWithBrowserCompiler(source);
  }

  const compiler = await createInitializedCompiler();

  try {
    return await compileWithCompiler(compiler, source);
  } finally {
    await compiler.dispose();
  }
};

export const formatCompileError = (error: unknown): string => {
  if (error instanceof CompileError && error.diagnostics.length > 0) {
    return error.diagnostics
      .map((diagnostic) => diagnostic.formatted || diagnostic.message)
      .join("\n\n");
  }

  return error instanceof Error ? error.message : String(error);
};
