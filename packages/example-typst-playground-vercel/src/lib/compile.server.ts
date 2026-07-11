import { Buffer } from "node:buffer";
import workerSource from "typst-wasm/worker/node?raw";
import coreUrl from "@typst-wasm/engine-wasm/worker/engine.core.wasm?url";
import core2Url from "@typst-wasm/engine-wasm/worker/engine.core2.wasm?url";
import core3Url from "@typst-wasm/engine-wasm/worker/engine.core3.wasm?url";
import {
  createTypstCompiler,
  createWorkerHost,
  type TypstCompiler,
} from "typst-wasm";
import { createCompileModule } from "./compile-core";

export { formatCompileError } from "./compile-core";

const nodeWorkerUrl = new URL(
  `data:text/javascript;base64,${Buffer.from(workerSource).toString("base64")}`,
);

const coreUrls = new Map([
  ["engine.core.wasm", coreUrl],
  ["engine.core2.wasm", core2Url],
  ["engine.core3.wasm", core3Url],
]);

const createInitializedCompiler = async (
  assetOrigin: string,
): Promise<TypstCompiler> => {
  return await createTypstCompiler({
    backend: "worker",
    getCoreModule: async (name) => {
      const url = coreUrls.get(name);
      if (!url) throw new Error(`Unknown core module: ${name}`);
      const response = await fetch(new URL(url, assetOrigin));
      return await WebAssembly.compile(await response.arrayBuffer());
    },
    worker: () => createWorkerHost(nodeWorkerUrl),
  });
};

export const { compileTypstHtml } = createCompileModule(
  createInitializedCompiler,
);
