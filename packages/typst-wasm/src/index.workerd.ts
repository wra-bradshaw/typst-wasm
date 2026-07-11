import { createTypstCompilerWithRuntime } from "./compiler/index";
import type { TypstCompiler, TypstCompilerOptions } from "./compiler/types";
import { selectAutomaticBackendKind as selectAutomaticBackendKindForRuntime } from "./backends/index";
import { workerdRuntime } from "./runtime/workerd";

type BackendSelection = "worker" | "jspi" | "none";

export { createWorkerHost } from "./runtime/workerd";

/** Creates a Typst compiler using the Cloudflare Workers runtime. */
export const createTypstCompiler = (
  options: TypstCompilerOptions,
): Promise<TypstCompiler> =>
  createTypstCompilerWithRuntime(options, workerdRuntime);

/** Always returns `false`; workers are unavailable in workerd. */
export const supportsWorkerBackend = (options: TypstCompilerOptions): boolean =>
  workerdRuntime.supportsWorkerBackend(options);

/** Returns whether the JSPI backend is available in this runtime. */
export const supportsJspiBackend = (): boolean =>
  workerdRuntime.supportsJspiBackend();

/** Reports the backend selected by the `auto` backend mode. */
export const selectAutomaticBackendKind = (
  options: TypstCompilerOptions,
): BackendSelection =>
  selectAutomaticBackendKindForRuntime(workerdRuntime, options);

export * from "./public-api";
