import { Buffer } from "node:buffer";
import {
  CompileError,
  createTypstCompiler,
  createWorkerHost,
  type TypstCompiler,
  type WasmDiagnostic,
} from "typst-wasm";
import wasmUrl from "@typst-wasm/engine-wasm/typst_wasm_bg.wasm?url";
import newComputerModernMathBoldUrl from "@typst-wasm/fonts/NewCMMath-Bold.otf?url";
import newComputerModernMathBookUrl from "@typst-wasm/fonts/NewCMMath-Book.otf?url";
import newComputerModernMathRegularUrl from "@typst-wasm/fonts/NewCMMath-Regular.otf?url";
import nodeWorkerSource from "typst-wasm/worker/node?raw";

export interface CompileView {
  html: string;
  diagnostics: WasmDiagnostic[];
}

let compilerPromise: Promise<TypstCompiler> | undefined;
let compileQueue: Promise<void> = Promise.resolve();

const fonts = [
  newComputerModernMathRegularUrl,
  newComputerModernMathBoldUrl,
  newComputerModernMathBookUrl,
];

const nodeWorkerUrl = new URL(
  `data:text/javascript;base64,${Buffer.from(nodeWorkerSource).toString(
    "base64",
  )}`,
);

const fetchBytes = async (url: string, assetOrigin: string): Promise<Uint8Array> => {
  const response = await fetch(new URL(url, assetOrigin));
  if (!response.ok) {
    throw new Error(`Failed to fetch asset ${url}: ${response.status}`);
  }
  return new Uint8Array(await response.arrayBuffer());
};

const createInitializedCompiler = async (
  assetOrigin: string,
): Promise<TypstCompiler> => {
  const compiler = await createTypstCompiler({
    backend: "worker",
    assets: {
      wasm: () => fetchBytes(wasmUrl, assetOrigin),
      worker: () => createWorkerHost(nodeWorkerUrl),
    },
  });

  try {
    for (const font of fonts) {
      await compiler.addFont(await fetchBytes(font, assetOrigin));
    }
    return compiler;
  } catch (error) {
    await compiler.dispose();
    throw error;
  }
};

const getCompiler = (assetOrigin: string): Promise<TypstCompiler> => {
  compilerPromise ??= createInitializedCompiler(assetOrigin).catch(
    (error: unknown) => {
      compilerPromise = undefined;
      throw error;
    },
  );

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

export const compileTypstHtml = (
  source: string,
  assetOrigin: string,
): Promise<CompileView> => {
  const compile = compileQueue.then(async () =>
    compileWithCompiler(await getCompiler(assetOrigin), source),
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
