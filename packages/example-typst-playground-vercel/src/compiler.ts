import { createIsomorphicFn } from "@tanstack/react-start";
import { Buffer } from "node:buffer";
import workerSource from "typst-wasm/worker/worker-thread?raw";
import coreUrl from "typst-wasm/engine/engine.core.wasm?url";
import core2Url from "typst-wasm/engine/engine.core2.wasm?url";
import core3Url from "typst-wasm/engine/engine.core3.wasm?url";
import {
  CompileError,
  createTypstCompiler,
  type CompileFormat,
  type CompileResult,
  type TypstCompiler,
} from "typst-wasm";
import { createWorkerThread } from "typst-wasm/worker/node";
import { createWebWorker } from "typst-wasm/worker/browser";
import browserWorkerUrl from "typst-wasm/worker/web-worker?worker&url";
import libertinusUrl from "@typst-wasm/fonts/LibertinusSerif-Regular.otf?url";
import mathUrl from "@typst-wasm/fonts/NewCMMath-Regular.otf?url";

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

const initializeCompiler = createIsomorphicFn()
  .server(async (): Promise<TypstCompiler> => {
    const { getRequestUrl } = await import("@tanstack/react-start/server");
    const assetOrigin = getRequestUrl().origin;
    const nodeWorkerUrl = new URL(
      `data:text/javascript;base64,${Buffer.from(workerSource).toString("base64")}`,
    );

    return createTypstCompiler({
      backend: "worker",
      coreModules: {
        "engine.core.wasm": WebAssembly.compileStreaming(
          fetch(new URL(coreUrl, assetOrigin)),
        ),
        "engine.core2.wasm": WebAssembly.compileStreaming(
          fetch(new URL(core2Url, assetOrigin)),
        ),
        "engine.core3.wasm": WebAssembly.compileStreaming(
          fetch(new URL(core3Url, assetOrigin)),
        ),
      },
      worker: () => createWorkerThread(nodeWorkerUrl),
    });
  })
  .client(async (): Promise<TypstCompiler> => {
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
  });

let compilerPromise: Promise<TypstCompiler> | undefined;
let compileQueue: Promise<void> = Promise.resolve();

const getCompiler = (): Promise<TypstCompiler> => {
  compilerPromise ??= initializeCompiler().catch((error: unknown) => {
    compilerPromise = undefined;
    throw error;
  });
  return compilerPromise;
};

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
