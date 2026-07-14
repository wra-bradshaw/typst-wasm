/**
 * Cloudflare Workers runtime functions for `typst-wasm/workerd`.
 *
 * @module Cloudflare Workers — Functions
 */
export {
  createTypstCompiler,
  selectAutomaticBackendKind,
  supportsJspiBackend,
  supportsWorkerBackend,
} from "typst-wasm/workerd";
