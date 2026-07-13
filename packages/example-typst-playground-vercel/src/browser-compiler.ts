import {
  createTypstCompiler,
  createWebWorker,
  type TypstCompiler,
} from "typst-wasm/browser";
import * as engine from "@typst-wasm/engine-wasm/jspi";
import browserWorkerUrl from "typst-wasm/worker/browser?worker&url";
import { createCompileModule } from "./lib/compile-core";

export { formatCompileError, type CompileView } from "./lib/compile-core";

const createInitializedCompiler = async (): Promise<TypstCompiler> => {
  return await createTypstCompiler({
    backend: "auto",
    engine,
    worker: () => createWebWorker(browserWorkerUrl),
  });
};

export const { compileTypstHtml } = createCompileModule(
  createInitializedCompiler,
);
