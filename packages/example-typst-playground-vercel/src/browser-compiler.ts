import {
  createTypstCompiler,
  createWorkerHost,
  type TypstCompiler,
} from "typst-wasm";
import wasmUrl from "@typst-wasm/engine-wasm/typst_wasm_bg.wasm?url";
import browserWorkerUrl from "typst-wasm/worker/browser?url";
import { createCompileModule } from "./lib/compile-core";

export { formatCompileError, type CompileView } from "./lib/compile-core";

const fetchBytes = async (url: string): Promise<Uint8Array> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch asset ${url}: ${response.status}`);
  }
  return new Uint8Array(await response.arrayBuffer());
};

const createInitializedCompiler = async (): Promise<TypstCompiler> => {
  return await createTypstCompiler({
    backend: "auto",
    assets: {
      wasm: () => fetchBytes(wasmUrl),
      worker: () => createWorkerHost(browserWorkerUrl),
    },
  });
};

export const { compileTypstHtml } = createCompileModule(createInitializedCompiler);

