declare module "@typst-wasm/engine-wasm/typst_wasm_bg.js" {
  import type { TypstCompiler } from "@typst-wasm/engine-wasm";

  export const TypstCompiler: typeof TypstCompiler;
  export function __wbg_set_wasm(wasm: WebAssembly.Exports): void;
}

declare module "@typst-wasm/engine-wasm/typst_wasm_bg.wasm?init" {
  const initWasm: (
    imports?: WebAssembly.Imports,
  ) => Promise<WebAssembly.Instance>;

  export default initWasm;
}
