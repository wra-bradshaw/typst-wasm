import { createTypstCompiler, type TypstCompiler } from "typst-wasm";
import core from "typst-wasm/engine/engine.core.wasm";
import core2 from "typst-wasm/engine/engine.core2.wasm";
import core3 from "typst-wasm/engine/engine.core3.wasm";
import { createCompileModule } from "./compile-core";

export { formatCompileError } from "./compile-core";

const createInitializedCompiler = (): Promise<TypstCompiler> =>
  createTypstCompiler({
    backend: "jspi",
    coreModules: {
      "engine.core.wasm": core,
      "engine.core2.wasm": core2,
      "engine.core3.wasm": core3,
    },
  });

export const { compileTypst } = createCompileModule(createInitializedCompiler);
