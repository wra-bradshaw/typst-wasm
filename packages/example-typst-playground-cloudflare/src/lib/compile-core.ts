import {
  CompileError,
  type TypstCompiler,
  type WasmDiagnostic,
} from "typst-wasm";

export interface CompileView {
  html: string;
  diagnostics: WasmDiagnostic[];
}

export const formatCompileError = (error: unknown): string => {
  if (error instanceof CompileError && error.diagnostics.length > 0) {
    return error.diagnostics
      .map((diagnostic) => diagnostic.formatted || diagnostic.message)
      .join("\n\n");
  }

  return error instanceof Error ? error.message : String(error);
};

export const createCompileModule = <Args extends any[]>(
  initCompiler: (...args: Args) => Promise<TypstCompiler>,
) => {
  let compilerPromise: Promise<TypstCompiler> | undefined;
  let compileQueue: Promise<void> = Promise.resolve();

  const getCompiler = (...args: Args): Promise<TypstCompiler> => {
    compilerPromise ??= initCompiler(...args).catch((error: unknown) => {
      compilerPromise = undefined;
      throw error;
    });

    return compilerPromise;
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

  const compileTypstHtml = (
    source: string,
    ...args: Args
  ): Promise<CompileView> => {
    const compile = compileQueue.then(async () =>
      compileWithCompiler(await getCompiler(...args), source),
    );

    compileQueue = compile.then(
      () => undefined,
      () => undefined,
    );

    return compile;
  };

  return {
    compileTypstHtml,
  };
};
