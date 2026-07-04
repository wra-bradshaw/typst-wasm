import { createTypstCompilerWithRuntime } from "./compiler/index";
import type { TypstCompiler, TypstCompilerOptions } from "./compiler/types";
import { selectAutomaticBackendKind as selectAutomaticBackendKindForRuntime } from "./backends/index";
import { browserRuntime } from "./runtime/browser";

type BackendSelection = "worker" | "jspi" | "none";

export { createBrowserWorkerHost, createWorkerHost } from "./runtime/browser";

export const createTypstCompiler = (
  options: TypstCompilerOptions,
): Promise<TypstCompiler> =>
  createTypstCompilerWithRuntime(options, browserRuntime);

export const supportsWorkerBackend = (options: TypstCompilerOptions): boolean =>
  browserRuntime.supportsWorkerBackend(options);

export const supportsJspiBackend = (): boolean =>
  browserRuntime.supportsJspiBackend();

export const selectAutomaticBackendKind = (
  options: TypstCompilerOptions,
): BackendSelection =>
  selectAutomaticBackendKindForRuntime(browserRuntime, options);

export * from "./public-api";
