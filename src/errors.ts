import { Data } from "effect";
import type { WasmDiagnostic } from "./wasm";

export class CompileError extends Data.TaggedError("CompileError")<{
  readonly diagnostics: WasmDiagnostic[];
  readonly message?: string;
  readonly cause?: unknown;
}> {}

export class CompilerNotInitializedError extends Data.TaggedError("CompilerNotInitializedError")<{
  readonly message: string;
}> {}

export class CompilerDisposedError extends Data.TaggedError("CompilerDisposedError")<{
  readonly message: string;
}> {}

export class CompilationInProgressError extends Data.TaggedError("CompilationInProgressError")<{
  readonly message: string;
}> {}

export class FontLoadError extends Data.TaggedError("FontLoadError")<{
  readonly fontName: string;
  readonly cause: unknown;
}> {}

export class FetchError extends Data.TaggedError("FetchError")<{
  readonly path: string;
  readonly cause: unknown;
}> {}

export class PackageParseError extends Data.TaggedError("PackageParseError")<{
  readonly spec: string;
  readonly message: string;
}> {}

export class PackageFetchError extends Data.TaggedError("PackageFetchError")<{
  readonly url: string;
  readonly cause: unknown;
}> {}

export class FileNotFoundError extends Data.TaggedError("FileNotFoundError")<{
  readonly filePath: string;
}> {}

export class CacheMissError extends Data.TaggedError("CacheMissError")<{
  readonly key: string;
}> {}

export class WorkerError extends Data.TaggedError("WorkerError")<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

export class ListFilesError extends Data.TaggedError("ListFilesError")<{
  readonly requestId: number;
  readonly message: string;
}> {}

export class HasFileError extends Data.TaggedError("HasFileError")<{
  readonly requestId: number;
  readonly path: string;
  readonly message: string;
}> {}
