import {
  createTypstCompiler,
  createWebWorker,
  type TypstCompiler,
} from "typst-wasm/browser";
import * as engine from "typst-wasm/engine";
import browserWorkerUrl from "typst-wasm/worker/web-worker?worker&url";
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
    engine,
    worker: () => createWebWorker(browserWorkerUrl),
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
