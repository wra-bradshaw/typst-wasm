import { createTypstCompilerWithRuntime } from "./compiler/index";
import type { TypstCompiler, TypstCompilerOptions } from "./compiler/types";
import { nodeRuntime } from "./runtime/node";
import { selectAutomaticBackendKind as selectAutomaticBackendKindForRuntime } from "./backends/index";

type BackendSelection = "worker" | "jspi" | "none";

export { createWorkerThread } from "./runtime/node";

/** Creates a Typst compiler using the Node.js runtime. */
export const createTypstCompiler = (
  options: TypstCompilerOptions,
): Promise<TypstCompiler> =>
  createTypstCompilerWithRuntime(options, nodeRuntime);

/** Returns whether the worker backend can be used with the supplied options. */
export const supportsWorkerBackend = (options: TypstCompilerOptions): boolean =>
  nodeRuntime.supportsWorkerBackend(options);

/** Returns whether the JSPI backend is available in this runtime. */
export const supportsJspiBackend = (): boolean =>
  nodeRuntime.supportsJspiBackend();

/** Reports the backend selected by the `auto` backend mode. */
export const selectAutomaticBackendKind = (
  options: TypstCompilerOptions,
): BackendSelection =>
  selectAutomaticBackendKindForRuntime(nodeRuntime, options);

export * from "./public-api";
