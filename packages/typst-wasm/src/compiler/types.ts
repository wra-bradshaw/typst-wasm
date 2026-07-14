import type { PackageCache } from "../files";
import type {
  CompileFormat,
  Diagnostic,
  EngineCoreModuleLoader,
  EngineModule,
  FetchedFile,
  FetchRequest,
  FileKind,
  LoadedFile,
  PdfStandard,
} from "../engine/types";
import type { WorkerHost } from "../worker/host";

export type {
  CompileFormat,
  Diagnostic,
  FetchRequest,
  FetchedFile,
  FileKind,
  LoadedFile,
  PdfStandard,
} from "../engine/types";

/** String values exposed to Typst through `sys.inputs`. */
export type CompileInputs = Record<string, string>;

/** Options controlling one compilation. */
export interface CompileOptions<F extends CompileFormat = CompileFormat> {
  /** Output format to produce. */
  format: F;
  /** Optional entry-point file path. */
  main?: string;
  /** String values available through Typst's `sys.inputs` dictionary. */
  inputs?: CompileInputs;
  /** Page selector, such as `"1,3-5"`. */
  pages?: string;
  /** PDF standards to target. */
  pdfStandards?: PdfStandard[];
  /** Pixels per inch for raster output. */
  ppi?: number;
}

/** Document metadata extracted from a successful compilation. */
export interface DocumentMetadata {
  title?: string;
  description?: string;
  author: string[];
  keywords: string[];
  /** Custom metadata values decoded from the engine's JSON representation. */
  custom: Array<{ label?: string; value: unknown }>;
}

interface CompileResultBase {
  diagnostics: Diagnostic[];
  metadata?: DocumentMetadata;
  dependencies: LoadedFile[];
}

/** PDF compilation result. */
export interface PdfCompileResult extends CompileResultBase {
  format: "pdf";
  output: Uint8Array;
}

/** PNG compilation result. */
export interface PngCompileResult extends CompileResultBase {
  format: "png";
  pages: Array<{ page: number; output: Uint8Array }>;
}

/** SVG compilation result. */
export interface SvgCompileResult extends CompileResultBase {
  format: "svg";
  pages: Array<{ page: number; output: string }>;
}

/** HTML compilation result. */
export interface HtmlCompileResult extends CompileResultBase {
  format: "html";
  output: string;
}

/** HTML bundle compilation result. */
export interface BundleCompileResult extends CompileResultBase {
  format: "bundle";
  files: Array<{ path: string; data: Uint8Array; mediaType?: string }>;
}

/** All caller-facing successful compilation results. */
export type AnyCompileResult =
  | PdfCompileResult
  | PngCompileResult
  | SvgCompileResult
  | HtmlCompileResult
  | BundleCompileResult;

/** Successful result corresponding to a requested output format. */
export type CompileResult<F extends CompileFormat = CompileFormat> = Extract<
  AnyCompileResult,
  { format: F }
>;

/** Resolves files requested by Typst. */
export type TypstFileLoader = (
  request: FetchRequest,
) => Promise<FetchedFile | null>;

/** Receives diagnostic and debug messages emitted by the library. */
export interface TypstLogger {
  /** Records a library message. */
  log(level: TypstLogLevel, message: string, context?: unknown): void;
}

export type TypstLogLevel = "error" | "debug";

/** Options used to create a {@link TypstCompiler}. */
export interface TypstCompilerOptions {
  /** Controls library messages. */
  logLevel?: TypstLogLevel;
  /** Receives library messages. */
  logger?: TypstLogger;
  /** Backend to use; `auto` selects the best available backend. */
  backend?: "auto" | "worker" | "jspi";
  /** JCO-generated engine module used by the JSPI backend. */
  engine?: EngineModule;
  /** Overrides the core WebAssembly module lookup. */
  getCoreModule?: EngineCoreModuleLoader;
  /** Creates the host used by the worker backend. */
  worker?: () => WorkerHost;
  /** Custom loaders tried before the built-in package and URL loaders. */
  fileLoaders?: TypstFileLoader[];
  /** Fetch implementation used for URL and package resources. */
  fetch?: typeof fetch;
  /** Base URL used to resolve Typst package downloads. */
  packageBaseUrl?: string;
  /** Package cache, or `false` to disable caching. */
  packageCache?: PackageCache | false;
  /** Capacity of the in-memory package cache. */
  memoryPackageCacheCapacity?: number;
}

/** Stateful promise-based Typst compiler. */
export interface TypstCompiler {
  /** Registers a font for subsequent compilations. */
  addFont(data: Uint8Array): Promise<void>;
  /** Adds binary data at a path in the virtual project. */
  addFile(path: string, data: Uint8Array): Promise<void>;
  /** Adds Typst source at a path in the virtual project. */
  addSource(path: string, text: string): Promise<void>;
  /** Removes a file from the virtual project. */
  removeFile(path: string): Promise<void>;
  /** Removes all files from the virtual project. */
  clearFiles(): Promise<void>;
  /** Lists paths currently in the virtual project. */
  listFiles(): Promise<string[]>;
  /** Tests whether a path exists in the virtual project. */
  hasFile(path: string): Promise<boolean>;
  /** Sets the default entry-point path. */
  setMain(path: string): Promise<void>;
  /** Compiles the project into the requested format. */
  compile<F extends CompileFormat>(
    options: CompileOptions<F>,
  ): Promise<CompileResult<F>>;
  /** Releases compiler and worker resources. */
  dispose(): Promise<void>;
}

/** @deprecated Use `Diagnostic`. */
export type TypstDiagnostic = Diagnostic;
/** @deprecated Use `FileKind`. */
export type TypstFileKind = FileKind;
/** @deprecated Use `FetchedFile`. */
export type TypstFileLoad = FetchedFile;
/** @deprecated Use `DocumentMetadata`. */
export type TypstDocumentMetadata = DocumentMetadata;
/** @deprecated Use `LoadedFile`. */
export type TypstLoadedFile = LoadedFile;
/** @deprecated Use `FetchRequest`. */
export type TypstFileRequest = FetchRequest;
