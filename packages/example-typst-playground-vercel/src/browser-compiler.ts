import {
  CompileError,
  createTypstCompiler,
  createWorkerHost,
  type TypstCompiler,
  type WasmDiagnostic,
} from "typst-wasm/browser";
import newComputerModernMathBoldUrl from "@typst-wasm/fonts/NewCMMath-Bold.otf?url";
import newComputerModernMathBookUrl from "@typst-wasm/fonts/NewCMMath-Book.otf?url";
import newComputerModernMathRegularUrl from "@typst-wasm/fonts/NewCMMath-Regular.otf?url";
import wasmUrl from "@typst-wasm/engine-wasm/typst_wasm_bg.wasm?url";
import browserWorkerUrl from "typst-wasm/worker/browser?url";

export interface CompileView {
  html: string;
  diagnostics: WasmDiagnostic[];
}

let compilerPromise: Promise<TypstCompiler> | undefined;
let compileQueue: Promise<void> = Promise.resolve();

const fontUrls = [
  newComputerModernMathRegularUrl,
  newComputerModernMathBoldUrl,
  newComputerModernMathBookUrl,
];

const fetchBytes = async (url: string): Promise<Uint8Array> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch asset ${url}: ${response.status}`);
  }
  return new Uint8Array(await response.arrayBuffer());
};

const createInitializedCompiler = async (): Promise<TypstCompiler> => {
  const compiler = await createTypstCompiler({
    backend: "auto",
    assets: {
      wasm: () => fetchBytes(wasmUrl),
      worker: () => createWorkerHost(browserWorkerUrl),
    },
  });

  try {
    for (const fontUrl of fontUrls) {
      await compiler.addFont(await fetchBytes(fontUrl));
    }
    return compiler;
  } catch (error) {
    await compiler.dispose();
    throw error;
  }
};

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
