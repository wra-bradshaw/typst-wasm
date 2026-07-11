import { createTypstCompiler, type TypstCompiler } from "typst-wasm";
import * as engine from "@typst-wasm/engine-wasm/jspi";
import core from "@typst-wasm/engine-wasm/jspi/engine.core.wasm";
import core2 from "@typst-wasm/engine-wasm/jspi/engine.core2.wasm";
import core3 from "@typst-wasm/engine-wasm/jspi/engine.core3.wasm";
import { createCompileModule } from "./compile-core";

export { formatCompileError } from "./compile-core";

const createInitializedCompiler = (): Promise<TypstCompiler> =>
  createTypstCompiler({
    backend: "jspi",
    engine,
    getCoreModule: (name) => {
      const module = coreModules.get(name);
      if (!module) throw new Error(`Unknown JSPI core module: ${name}`);
      return module;
    },
  });

const coreModules = new Map<string, WebAssembly.Module>([
  ["engine.core.wasm", core],
  ["engine.core2.wasm", core2],
  ["engine.core3.wasm", core3],
]);

export const { compileTypstHtml } = createCompileModule(
  createInitializedCompiler,
);
