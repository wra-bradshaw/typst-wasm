import {
  createTypstCompiler,
  createWebWorker,
  type TypstCompiler,
} from "typst-wasm/browser";
import browserWorkerUrl from "typst-wasm/worker/web-worker?worker&url";
import coreUrl from "typst-wasm/engine/engine.core.wasm?url";
import core2Url from "typst-wasm/engine/engine.core2.wasm?url";
import core3Url from "typst-wasm/engine/engine.core3.wasm?url";
import { createCompileModule } from "./lib/compile-core";
import libertinusUrl from "@typst-wasm/fonts/LibertinusSerif-Regular.otf?url";
import mathUrl from "@typst-wasm/fonts/NewCMMath-Regular.otf?url";

export {
  formatCompileError,
  type CompileView,
  type PlaygroundFormat,
} from "./lib/compile-core";

const createInitializedCompiler = async (): Promise<TypstCompiler> => {
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

export const { compileTypst } = createCompileModule(createInitializedCompiler);
