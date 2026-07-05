import {
  createTypstCompiler,
  type TypstCompiler,
} from "typst-wasm";
import wasmModule from "@typst-wasm/engine-wasm/typst_wasm_bg.wasm?module";
import { createCompileModule } from "./compile-core";

export { formatCompileError } from "./compile-core";

const createInitializedCompiler = (): Promise<TypstCompiler> =>
  createTypstCompiler({
    backend: "jspi",
    assets: {
      wasm: wasmModule,
    },
  });

export const { compileTypstHtml } = createCompileModule(createInitializedCompiler);

