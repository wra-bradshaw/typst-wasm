/// <reference types="vite/client" />

declare module "*.wasm" {
  const module: WebAssembly.Module;
  export default module;
}
