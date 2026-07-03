import { createTypstCompilerWithRuntime } from "./compiler/index";
import type { TypstCompiler, TypstCompilerOptions } from "./compiler/types";
import { selectAutomaticBackendKind as selectAutomaticBackendKindForRuntime } from "./backends/index";
import { workerdRuntime } from "./runtime/workerd";

type BackendSelection = "worker" | "jspi" | "none";

export const createTypstCompiler = (
  options: TypstCompilerOptions = {},
): Promise<TypstCompiler> =>
  createTypstCompilerWithRuntime(options, workerdRuntime);

export const supportsWorkerBackend = (): boolean =>
  workerdRuntime.supportsWorkerBackend();

export const supportsJspiBackend = (): boolean =>
  workerdRuntime.supportsJspiBackend();

export const selectAutomaticBackendKind = (): BackendSelection =>
  selectAutomaticBackendKindForRuntime(workerdRuntime);

export * from "./public-api";
