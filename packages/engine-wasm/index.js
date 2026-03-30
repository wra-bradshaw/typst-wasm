export const wasmBinaryUrl = new URL("./dist/typst_wasm_bg.wasm", import.meta.url);

export const loadWasmModule = () => import("./dist/typst_wasm.js");
