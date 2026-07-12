import type { TypstCompiler, TypstCompilerOptions } from "typst-wasm";
export type IntegrationRuntime =
  | "bun"
  | "node"
  | "workerd"
  | "deno"
  | "chromium"
  | "firefox"
  | "webkit";
export type IntegrationBackend = "worker" | "jspi";
export type IntegrationCell = `${IntegrationRuntime}:${IntegrationBackend}`;

export type IntegrationError = {
  name: string;
  message: string;
  stack?: string;
};

export type CaseResult = {
  runtime: IntegrationRuntime;
  backend: IntegrationBackend;
  caseId: string;
  durationMs: number;
  passed: boolean;
  error?: IntegrationError;
};

/** Resources and host facilities exposed to portable canonical cases. */
export type IntegrationContext = {
  runtime: IntegrationRuntime;
  backend: IntegrationBackend;
  cell: IntegrationCell;
  /** The adapter's observed backend; must equal the requested cell backend. */
  selectedBackend: IntegrationBackend;
  /** Observe backend selection without constructing a compiler. */
  selectBackend: (
    options?: TypstCompilerOptions,
  ) => IntegrationBackend | "none";
  /** Verify an explicitly unavailable backend rejects instead of falling back. */
  expectUnsupportedBackend: () => Promise<void>;
  createCompiler: (options?: TypstCompilerOptions) => Promise<TypstCompiler>;
  withCompiler: <T>(
    run: (compiler: TypstCompiler) => Promise<T>,
    options?: TypstCompilerOptions,
  ) => Promise<T>;
  fetch: typeof fetch;
  fonts: readonly Uint8Array[];
  /** Number of package archive requests made by the fixture loader. */
  packageRequests?: () => number;
  log?: (message: string) => void;
};

export type CanonicalCase = {
  id: string;
  /** Cases requiring state across steps share one compiler instance. */
  isolation: "fresh" | "shared" | "self-managed";
  /** Shared cases only reuse state within the same named scenario group. */
  sharedGroup?: string;
  run: (context: IntegrationContext) => Promise<void>;
};

export const serializeError = (error: unknown): IntegrationError => {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack };
  }
  return { name: "Error", message: String(error) };
};
