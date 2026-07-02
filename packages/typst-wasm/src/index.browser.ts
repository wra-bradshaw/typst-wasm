import { createTypstCompilerWithRuntime } from "./compiler/index";
import type { TypstCompiler, TypstCompilerOptions } from "./compiler/types";
import { browserRuntime } from "./runtime/browser";

export const createTypstCompiler = (
  options: TypstCompilerOptions = {},
): Promise<TypstCompiler> =>
  createTypstCompilerWithRuntime(options, browserRuntime);

export * from "./public-api";
export {
  supportsWorkerBackend,
  supportsJspiBackend,
  selectAutomaticBackendKind,
} from "./backends/index";
