import { Buffer } from "node:buffer";
import {
  createTypstCompiler,
  createWorkerHost,
  type TypstCompiler,
} from "typst-wasm";
import wasmUrl from "@typst-wasm/engine-wasm/typst_wasm_bg.wasm?url";
import nodeWorkerSource from "typst-wasm/worker/node?raw";
import { createCompileModule } from "./compile-core";

export { formatCompileError } from "./compile-core";

const nodeWorkerUrl = new URL(
  `data:text/javascript;base64,${Buffer.from(nodeWorkerSource).toString(
    "base64",
  )}`,
);

const fetchBytes = async (
  url: string,
  assetOrigin: string,
): Promise<Uint8Array> => {
  const response = await fetch(new URL(url, assetOrigin));
  if (!response.ok) {
    throw new Error(`Failed to fetch asset ${url}: ${response.status}`);
  }
  return new Uint8Array(await response.arrayBuffer());
};

const createInitializedCompiler = async (
  assetOrigin: string,
): Promise<TypstCompiler> => {
  return await createTypstCompiler({
    backend: "worker",
    assets: {
      wasm: () => fetchBytes(wasmUrl, assetOrigin),
      worker: () => createWorkerHost(nodeWorkerUrl),
    },
  });
};

export const { compileTypstHtml } = createCompileModule(createInitializedCompiler);

