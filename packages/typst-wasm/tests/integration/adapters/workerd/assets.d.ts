declare module "*.wasm?module" {
  const value: WebAssembly.Module;
  export default value;
}

declare module "*.otf" {
  const value: ArrayBuffer;
  export default value;
}
