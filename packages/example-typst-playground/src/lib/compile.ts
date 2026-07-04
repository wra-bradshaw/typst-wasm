import {
  CompileError,
  createTypstCompiler,
  createWorkerHost,
  type TypstCompiler,
  type WasmDiagnostic,
} from "typst-wasm";
import newComputerModernMathBoldUrl from "@typst-wasm/fonts/NewCMMath-Bold.otf?url";
import newComputerModernMathBookUrl from "@typst-wasm/fonts/NewCMMath-Book.otf?url";
import newComputerModernMathRegularUrl from "@typst-wasm/fonts/NewCMMath-Regular.otf?url";
import browserWorkerUrl from "typst-wasm/worker/browser?url";
import wasmUrl from "../../../engine-wasm/dist/typst_wasm_bg.wasm?url";

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

const isAbsoluteUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

const resolveFetchUrl = async (url: string): Promise<string> => {
  if (!import.meta.env.SSR || isAbsoluteUrl(url)) {
    return url;
  }

  const { getRequestUrl } =
    await import("@tanstack/start-server-core/request-response");
  return new URL(
    url,
    getRequestUrl({ xForwardedHost: true, xForwardedProto: true }),
  ).href;
};

const fetchBytes = async (url: string): Promise<Uint8Array> => {
  const response = await fetch(await resolveFetchUrl(url));
  if (!response.ok) {
    throw new Error(`Failed to fetch asset: ${response.status}`);
  }
  return new Uint8Array(await response.arrayBuffer());
};

const resolveWorkerUrl = (): string | URL =>
  import.meta.env.SSR
    ? new URL(import.meta.resolve("typst-wasm/worker/node"))
    : browserWorkerUrl;

const createInitializedCompiler = async (): Promise<TypstCompiler> => {
  const compiler = await createTypstCompiler({
    backend: "auto",
    assets: {
      wasm: () => fetchBytes(wasmUrl),
      worker: () => createWorkerHost(resolveWorkerUrl()),
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

const compileWithSharedCompiler = (source: string): Promise<CompileView> => {
  const compile = compileQueue.then(async () =>
    compileWithCompiler(await getCompiler(), source),
  );

  compileQueue = compile.then(
    () => undefined,
    () => undefined,
  );

  return compile;
};

export const compileTypstHtml = async (
  source: string,
): Promise<CompileView> => {
  return compileWithSharedCompiler(source);
};

export const formatCompileError = (error: unknown): string => {
  if (error instanceof CompileError && error.diagnostics.length > 0) {
    return error.diagnostics
      .map((diagnostic) => diagnostic.formatted || diagnostic.message)
      .join("\n\n");
  }

  return error instanceof Error ? error.message : String(error);
};
