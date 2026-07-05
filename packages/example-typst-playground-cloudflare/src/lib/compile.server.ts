import {
  CompileError,
  createTypstCompiler,
  type TypstCompiler,
  type WasmDiagnostic,
} from "typst-wasm";
import wasmModule from "@typst-wasm/engine-wasm/typst_wasm_bg.wasm?module";

export interface CompileView {
  html: string;
  diagnostics: WasmDiagnostic[];
}

let compilerPromise: Promise<TypstCompiler> | undefined;
let compileQueue: Promise<void> = Promise.resolve();

const createInitializedCompiler = (): Promise<TypstCompiler> =>
  createTypstCompiler({
    backend: "jspi",
    assets: {
      wasm: wasmModule,
    },
  });

const getCompiler = (): Promise<TypstCompiler> => {
  compilerPromise ??= createInitializedCompiler().catch((error: unknown) => {
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

export const compileTypstHtml = (source: string): Promise<CompileView> => {
  const compile = compileQueue.then(async () =>
    compileWithCompiler(await getCompiler(), source),
  );

  compileQueue = compile.then(
    () => undefined,
    () => undefined,
  );

  return compile;
};

export const formatCompileError = (error: unknown): string => {
  if (error instanceof CompileError && error.diagnostics.length > 0) {
    return error.diagnostics
      .map((diagnostic) => diagnostic.formatted || diagnostic.message)
      .join("\n\n");
  }

  return error instanceof Error ? error.message : String(error);
};
