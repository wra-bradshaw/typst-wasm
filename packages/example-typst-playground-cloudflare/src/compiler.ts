// docs:start imports
import { createIsomorphicFn } from "@tanstack/react-start";
import {
  CompileError,
  createTypstCompiler,
  type CompileFormat,
  type CompileResult,
  type TypstCompiler,
} from "typst-wasm";
import { createWebWorker } from "typst-wasm/worker/browser";
import browserWorkerUrl from "typst-wasm/worker/web-worker?worker&url";
import coreUrl from "typst-wasm/engine/engine.core.wasm?url";
import core2Url from "typst-wasm/engine/engine.core2.wasm?url";
import core3Url from "typst-wasm/engine/engine.core3.wasm?url";
import core from "typst-wasm/engine/engine.core.wasm";
import core2 from "typst-wasm/engine/engine.core2.wasm";
import core3 from "typst-wasm/engine/engine.core3.wasm";
import libertinusUrl from "@typst-wasm/fonts/LibertinusSerif-Regular.otf?url";
import mathUrl from "@typst-wasm/fonts/NewCMMath-Regular.otf?url";
// docs:end imports

export type PlaygroundFormat = Exclude<CompileFormat, "bundle">;
export type PlaygroundResult = {
  [F in PlaygroundFormat]: Omit<CompileResult<F>, "metadata" | "dependencies">;
}[PlaygroundFormat];
export const formatCompileError = (error: unknown): string => {
  if (error instanceof CompileError && error.diagnostics.length > 0) {
    return error.diagnostics
      .map((diagnostic) => diagnostic.formatted || diagnostic.message)
      .join("\n\n");
  }

  return error instanceof Error ? error.message : String(error);
};

// docs:start server-initializer
const initializeServerCompiler = (): Promise<TypstCompiler> =>
  createTypstCompiler({
    backend: "jspi",
    coreModules: {
      "engine.core.wasm": core,
      "engine.core2.wasm": core2,
      "engine.core3.wasm": core3,
    },
  });
// docs:end server-initializer

// docs:start browser-initializer
const initializeBrowserCompiler = async (): Promise<TypstCompiler> => {
  const compiler = await createTypstCompiler({
    backend: "auto",
    worker: () => createWebWorker(browserWorkerUrl),
    coreModules: {
      "engine.core.wasm": WebAssembly.compileStreaming(fetch(coreUrl)),
      "engine.core2.wasm": WebAssembly.compileStreaming(fetch(core2Url)),
      "engine.core3.wasm": WebAssembly.compileStreaming(fetch(core3Url)),
    },
  });

  await compiler.addFonts(
    fetch(libertinusUrl).then((res) =>
      res.arrayBuffer().then((res) => new Uint8Array(res)),
    ),
    fetch(mathUrl).then((res) =>
      res.arrayBuffer().then((res) => new Uint8Array(res)),
    ),
  );

  return compiler;
};
// docs:end browser-initializer

// docs:start isomorphic-selector
const initializeCompiler = createIsomorphicFn()
  .server(initializeServerCompiler)
  .client(initializeBrowserCompiler);
// docs:end isomorphic-selector

// docs:start compiler-cache
let compilerPromise: Promise<TypstCompiler> | undefined;
let compileQueue: Promise<void> = Promise.resolve();

const getCompiler = (): Promise<TypstCompiler> => {
  compilerPromise ??= initializeCompiler().catch((error: unknown) => {
    compilerPromise = undefined;
    throw error;
  });
  return compilerPromise;
};
// docs:end compiler-cache

// docs:start compile-facade
export const compileTypst = async (
  source: string,
  format: PlaygroundFormat,
) => {
  const compile = compileQueue.then(async () => {
    const compiler = await getCompiler();
    await compiler.addSource("main.typ", source);
    return await compiler.compile({ main: "main.typ", format });
  });

  compileQueue = compile.then(
    () => undefined,
    () => undefined,
  );

  return await compile;
};
// docs:end compile-facade
