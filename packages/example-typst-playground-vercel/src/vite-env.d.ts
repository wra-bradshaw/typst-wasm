/// <reference types="vite/client" />

declare module "*.wasm?module" {
  const module: WebAssembly.Module;
  export default module;
}

declare module "*?raw" {
  const source: string;
  export default source;
}
