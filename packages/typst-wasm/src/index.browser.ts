import { createTypstCompilerWithRuntime } from "./compiler/index";
import type { TypstCompiler, TypstCompilerOptions } from "./compiler/types";
import { selectAutomaticBackendKind as selectAutomaticBackendKindForRuntime } from "./backends/index";
import { browserRuntime } from "./runtime/browser";

type BackendSelection = "worker" | "jspi" | "none";

export const createTypstCompiler = (
  options: TypstCompilerOptions = {},
): Promise<TypstCompiler> =>
  createTypstCompilerWithRuntime(options, browserRuntime);

export const supportsWorkerBackend = (): boolean =>
  browserRuntime.supportsWorkerBackend();

export const supportsJspiBackend = (): boolean =>
  browserRuntime.supportsJspiBackend();

export const selectAutomaticBackendKind = (): BackendSelection =>
  selectAutomaticBackendKindForRuntime(browserRuntime);

export * from "./public-api";
