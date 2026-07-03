import { createTypstCompilerWithRuntime } from "./compiler/index";
import type { TypstCompiler, TypstCompilerOptions } from "./compiler/types";
import { nodeRuntime } from "./runtime/node";
import { selectAutomaticBackendKind as selectAutomaticBackendKindForRuntime } from "./backends/index";

type BackendSelection = "worker" | "jspi" | "none";

export const createTypstCompiler = (
  options: TypstCompilerOptions,
): Promise<TypstCompiler> =>
  createTypstCompilerWithRuntime(options, nodeRuntime);

export const supportsWorkerBackend = (): boolean =>
  nodeRuntime.supportsWorkerBackend();

export const supportsJspiBackend = (): boolean =>
  nodeRuntime.supportsJspiBackend();

export const selectAutomaticBackendKind = (): BackendSelection =>
  selectAutomaticBackendKindForRuntime(nodeRuntime);

export * from "./public-api";
