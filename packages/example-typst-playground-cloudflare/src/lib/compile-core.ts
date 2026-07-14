import {
  CompileError,
  type CompileFormat,
  type Diagnostic,
  type TypstCompiler,
} from "typst-wasm";

export type PlaygroundFormat = Exclude<CompileFormat, "bundle">;
export type CompileView =
  | { format: "html"; output: string; diagnostics: Diagnostic[] }
  | { format: "pdf"; output: Uint8Array; diagnostics: Diagnostic[] }
  | { format: "png"; pages: Array<{ page: number; output: Uint8Array }>; diagnostics: Diagnostic[] }
  | { format: "svg"; pages: Array<{ page: number; output: string }>; diagnostics: Diagnostic[] };

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
    format: PlaygroundFormat,
  ): Promise<CompileView> => {
    await compiler.addSource("main.typ", source);

    const result = await compiler.compile({
      main: "main.typ",
      format,
    });

    return result as CompileView;
  };

  const compileTypst = (
    source: string,
    format: PlaygroundFormat,
    ...args: Args
  ): Promise<CompileView> => {
    const compile = compileQueue.then(async () =>
      compileWithCompiler(await getCompiler(...args), source, format),
    );

    compileQueue = compile.then(
      () => undefined,
      () => undefined,
    );

    return compile;
  };

  return {
    compileTypst,
  };
};
