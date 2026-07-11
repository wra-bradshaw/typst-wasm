import type { TypstDiagnostic } from "./compiler/types";

export class TypstError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = new.target.name;
  }
}

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

export class CompilerNotInitializedError extends TypstError {}

export class CompilerDisposedError extends TypstError {}

export class FontLoadError extends TypstError {
  readonly fontName: string;

  constructor(fontName: string, cause: unknown) {
    super(`Failed to load font "${fontName}"`, { cause });
    this.fontName = fontName;
  }
}

export class FetchError extends TypstError {
  readonly path: string;

  constructor(path: string, cause: unknown) {
    super(`Failed to fetch "${path}"`, { cause });
    this.path = path;
  }
}

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

export class PackageFetchError extends TypstError {
  readonly url: string;

  constructor(url: string, cause: unknown) {
    super(`Failed to fetch package: ${url} (${causeMessage(cause)})`, {
      cause,
    });
    this.url = url;
  }
}

export class FileNotFoundError extends TypstError {
  readonly filePath: string;

  constructor(filePath: string) {
    super(`File not found: ${filePath}`);
    this.filePath = filePath;
  }
}

export class WorkerError extends TypstError {}
