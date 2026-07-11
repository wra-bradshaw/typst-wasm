import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import {
  createTypstCompiler,
  createWorkerHost,
  type TypstCompiler,
} from "typst-wasm";
import { createCompileModule } from "./compile-core";

export { formatCompileError } from "./compile-core";

const require = createRequire(import.meta.url);
const nodeWorkerUrl = pathToFileURL(require.resolve("typst-wasm/worker/node"));

const createInitializedCompiler = async (
  _assetOrigin: string,
): Promise<TypstCompiler> => {
  return await createTypstCompiler({
    backend: "worker",
    worker: () => createWorkerHost(nodeWorkerUrl),
  });
};

export const { compileTypstHtml } = createCompileModule(
  createInitializedCompiler,
);
