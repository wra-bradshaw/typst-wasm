import { createTypstCompilerWithRuntime } from "./compiler/index";
import type { TypstCompiler, TypstCompilerOptions } from "./compiler/types";
import { nodeRuntime } from "./runtime/node";
import { selectAutomaticBackendKind as selectAutomaticBackendKindForRuntime } from "./backends/index";

type BackendSelection = "worker" | "jspi" | "none";

export { createNodeWorkerHost, createWorkerHost } from "./runtime/node";

export const createTypstCompiler = (
  options: TypstCompilerOptions,
): Promise<TypstCompiler> =>
  createTypstCompilerWithRuntime(options, nodeRuntime);

export const supportsWorkerBackend = (options: TypstCompilerOptions): boolean =>
  nodeRuntime.supportsWorkerBackend(options);

export const supportsJspiBackend = (): boolean =>
  nodeRuntime.supportsJspiBackend();

export const selectAutomaticBackendKind = (
  options: TypstCompilerOptions,
): BackendSelection =>
  selectAutomaticBackendKindForRuntime(nodeRuntime, options);

export * from "./public-api";
