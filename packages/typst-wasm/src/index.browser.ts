import { createTypstCompilerWithRuntime } from "./compiler/index";
import type { TypstCompiler, TypstCompilerOptions } from "./compiler/types";
import { selectAutomaticBackendKind as selectAutomaticBackendKindForRuntime } from "./backends/index";
import { browserRuntime } from "./runtime/browser";

type BackendSelection = "worker" | "jspi" | "none";

export { createWebWorker } from "./runtime/browser";

/** Creates a Typst compiler using browser-compatible runtime facilities. */
export const createTypstCompiler = (
  options: TypstCompilerOptions,
): Promise<TypstCompiler> =>
  createTypstCompilerWithRuntime(options, browserRuntime);

/** Returns whether the worker backend can run in the current browser. */
export const supportsWorkerBackend = (options: TypstCompilerOptions): boolean =>
  browserRuntime.supportsWorkerBackend(options);

/** Returns whether the JSPI backend is available in this browser. */
export const supportsJspiBackend = (): boolean =>
  browserRuntime.supportsJspiBackend();

/** Reports the backend selected by the `auto` backend mode. */
export const selectAutomaticBackendKind = (
  options: TypstCompilerOptions,
): BackendSelection =>
  selectAutomaticBackendKindForRuntime(browserRuntime, options);

export * from "./public-api";
