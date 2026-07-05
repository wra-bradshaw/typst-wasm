import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  CompileError,
  createTypstCompiler,
  createWorkerHost,
  type TypstCompiler,
  type WasmDiagnostic,
} from "typst-wasm/node";
import newComputerModernMathBoldPath from "@typst-wasm/fonts/NewCMMath-Bold.otf";
import newComputerModernMathBookPath from "@typst-wasm/fonts/NewCMMath-Book.otf";
import newComputerModernMathRegularPath from "@typst-wasm/fonts/NewCMMath-Regular.otf";
import wasmPath from "@typst-wasm/engine-wasm/typst_wasm_bg.wasm";

export interface CompileView {
  html: string;
  diagnostics: WasmDiagnostic[];
}

let compilerPromise: Promise<TypstCompiler> | undefined;
let compileQueue: Promise<void> = Promise.resolve();

const resolveNextAsset = (assetPath: string): URL => {
  const relativePath = assetPath
    .replace(/^\/?_next\//, "")
    .replace(/^\//, "");
  return pathToFileURL(join(process.cwd(), ".next", relativePath));
};

const resolveNextServerChunkAsset = (assetUrl: URL): string => {
  if (assetUrl.protocol === "file:") {
    return fileURLToPath(assetUrl);
  }

  const relativePath = assetUrl.href
    .replace(/^\/?_next\//, "")
    .replace(/^\//, "");
  return join(process.cwd(), ".next", "server", "chunks", relativePath);
};

const wasmUrl = resolveNextAsset(wasmPath);

const fontUrls = [
  resolveNextAsset(newComputerModernMathRegularPath),
  resolveNextAsset(newComputerModernMathBoldPath),
  resolveNextAsset(newComputerModernMathBookPath),
];

const nodeWorkerUrl = new URL("typst-wasm/worker/node", import.meta.url);
const nodeWorkerPath = resolveNextServerChunkAsset(nodeWorkerUrl);

const createInitializedCompiler = async (): Promise<TypstCompiler> => {
  const compiler = await createTypstCompiler({
    backend: "worker",
    assets: {
      wasm: () => readFile(wasmUrl),
      worker: () => createWorkerHost(nodeWorkerPath),
    },
  });

  try {
    for (const fontUrl of fontUrls) {
      await compiler.addFont(new Uint8Array(await readFile(fontUrl)));
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
