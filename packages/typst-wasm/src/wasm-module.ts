export type WasmModuleOrPath =
  | RequestInfo
  | URL
  | Response
  | BufferSource
  | WebAssembly.Module;
