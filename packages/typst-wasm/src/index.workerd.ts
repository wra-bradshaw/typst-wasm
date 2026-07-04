import { createTypstCompilerWithRuntime } from "./compiler/index";
import type { TypstCompiler, TypstCompilerOptions } from "./compiler/types";
import { selectAutomaticBackendKind as selectAutomaticBackendKindForRuntime } from "./backends/index";
import { workerdRuntime } from "./runtime/workerd";

type BackendSelection = "worker" | "jspi" | "none";

export { createWorkerHost } from "./runtime/workerd";

export const createTypstCompiler = (
  options: TypstCompilerOptions,
): Promise<TypstCompiler> =>
  createTypstCompilerWithRuntime(options, workerdRuntime);

export const supportsWorkerBackend = (options: TypstCompilerOptions): boolean =>
  workerdRuntime.supportsWorkerBackend(options);

export const supportsJspiBackend = (): boolean =>
  workerdRuntime.supportsJspiBackend();

export const selectAutomaticBackendKind = (
  options: TypstCompilerOptions,
): BackendSelection =>
  selectAutomaticBackendKindForRuntime(workerdRuntime, options);

export * from "./public-api";
