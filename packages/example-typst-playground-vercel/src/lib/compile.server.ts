import { Buffer } from "node:buffer";
import workerSource from "typst-wasm/worker/worker-thread?raw";
import coreUrl from "typst-wasm/engine/engine.core.wasm?url";
import core2Url from "typst-wasm/engine/engine.core2.wasm?url";
import core3Url from "typst-wasm/engine/engine.core3.wasm?url";
import {
  createTypstCompiler,
  type TypstCompiler,
} from "typst-wasm";
import { createWorkerThread } from "typst-wasm/worker/node";
import { createCompileModule } from "./compile-core";

export { formatCompileError } from "./compile-core";

const nodeWorkerUrl = new URL(
  `data:text/javascript;base64,${Buffer.from(workerSource).toString("base64")}`,
);

const createInitializedCompiler = async (
  assetOrigin: string,
): Promise<TypstCompiler> => {
  return await createTypstCompiler({
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
};

export const { compileTypst } = createCompileModule(createInitializedCompiler);
