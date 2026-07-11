import type { TypstDiagnostic } from "./compiler/types";

/** Base class for errors raised by the Typst compiler API. */
export class TypstError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = new.target.name;
  }
}

/** Indicates that compilation failed or produced error diagnostics. */
export class CompileError extends TypstError {
  readonly diagnostics: TypstDiagnostic[];

  constructor(
    message: string,
    options: { diagnostics?: TypstDiagnostic[]; cause?: unknown } = {},
  ) {
    super(message, { cause: options.cause });
    this.diagnostics = options.diagnostics ?? [];
  }
}

/** Indicates that an operation was attempted before compiler initialization. */
export class CompilerNotInitializedError extends TypstError {}

/** Indicates that an operation was attempted after compiler disposal. */
export class CompilerDisposedError extends TypstError {}

/** Indicates that a font asset could not be loaded or registered. */
export class FontLoadError extends TypstError {
  readonly fontName: string;

  constructor(fontName: string, cause: unknown) {
    super(`Failed to load font "${fontName}"`, { cause });
    this.fontName = fontName;
  }
}

/** Indicates that a requested file could not be fetched. */
export class FetchError extends TypstError {
  readonly path: string;

  constructor(path: string, cause: unknown) {
    super(`Failed to fetch "${path}"`, { cause });
    this.path = path;
  }
}

/** Indicates that a Typst package specification is invalid. */
export class PackageParseError extends TypstError {
  readonly spec: string;

  constructor(spec: string, message: string) {
    super(message);
    this.spec = spec;
  }
}

const causeMessage = (cause: unknown): string => {
  if (cause instanceof Error) return cause.message;
  if (typeof cause === "string") return cause;
  return String(cause);
};

/** Indicates that a Typst package could not be fetched. */
export class PackageFetchError extends TypstError {
  readonly url: string;

  constructor(url: string, cause: unknown) {
    super(`Failed to fetch package: ${url} (${causeMessage(cause)})`, {
      cause,
    });
    this.url = url;
  }
}

/** Indicates that a requested file does not exist. */
export class FileNotFoundError extends TypstError {
  readonly filePath: string;

  constructor(filePath: string) {
    super(`File not found: ${filePath}`);
    this.filePath = filePath;
  }
}

/** Indicates a failure communicating with a compiler worker. */
export class WorkerError extends TypstError {}
