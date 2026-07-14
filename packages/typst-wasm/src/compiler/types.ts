import type { PackageCache } from "../files";
import type { EngineCoreModuleLoader, EngineModule } from "../engine/types";
import type { WorkerHost } from "../worker/host";

export type TypstLogLevel = "error" | "debug";

/** Receives diagnostic and debug messages emitted by the library. */
export interface TypstLogger {
  /** Records a library message. */
  log(level: TypstLogLevel, message: string, context?: unknown): void;
}

export type CompileFormat = "pdf" | "png" | "svg" | "html" | "bundle";
export type TypstFileKind = "project" | "package" | "url";

/** A file requested while compiling a document. */
export interface TypstFileRequest {
  /** Path requested by Typst. */
  path: string;
  /** Whether the path belongs to the project, a package, or a URL. */
  kind: TypstFileKind;
}

/** File data returned by a custom file loader. */
export interface TypstFileLoad {
  /** File contents. */
  data: Uint8Array;
  /** Host-resolved path, used for dependency tracking. */
  resolvedPath?: string;
  /** MIME type of the file, when known. */
  mediaType?: string;
}

/** Resolves project, package, or URL files requested by Typst. */
export interface TypstFileLoader {
  /** Returns the file, or `null` when this loader does not handle it. */
  load(
    request: TypstFileRequest,
  ): Promise<TypstFileLoad | Uint8Array | null | undefined>;
}

/** A file loaded during compilation. */
export interface TypstLoadedFile {
  path: string;
  kind: TypstFileKind;
  resolvedPath?: string;
  mediaType?: string;
}

export interface TypstDocumentMetadata {
  title?: string;
  description?: string;
  author: string[];
  keywords: string[];
  custom: Array<{ label?: string; value: unknown }>;
}

/** Options used to create a {@link TypstCompiler}. */
export interface TypstCompilerOptions {
  /** Controls library messages. Errors are reported by default; debug includes protocol activity. */
  logLevel?: TypstLogLevel;
  /** Receives library messages. Context may contain paths and underlying errors. */
  logger?: TypstLogger;
  /** Backend to use; `auto` selects the best available backend. */
  backend?: "auto" | "worker" | "jspi";
  /** JCO-generated engine module used by the JSPI backend. */
  engine?: EngineModule;
  /** Overrides JCO's default core WebAssembly module lookup. */
  getCoreModule?: EngineCoreModuleLoader;
  /** Creates the host used by the worker backend when it is selected. */
  worker?: () => WorkerHost;
  /** Custom loaders tried before the built-in package and URL loaders. */
  fileLoaders?: TypstFileLoader[];
  /** Fetch implementation used for URL and package resources. */
  fetch?: typeof fetch;
  /** Base URL used to resolve Typst package downloads. */
  packageBaseUrl?: string;
  /** Package cache, or `false` to disable caching. */
  packageCache?: PackageCache | false;
  /** Capacity of the default in-memory package cache. */
  memoryPackageCacheCapacity?: number;
}

/** Options controlling one compilation. */
export interface CompileOptions {
  /** Output format. */
  format: CompileFormat;
  /** Entry-point file path. */
  main?: string;
  /** String inputs made available through Typst's `sys.inputs` mechanism. */
  inputs?: Record<string, string>;
  /** Page selector, such as `"1,3-5"`. */
  pages?: string;
  /** PDF standards to target. */
  pdfStandards?: string[];
  /** Pixels per inch for raster output. */
  ppi?: number;
}

/** A warning or error reported by Typst. */
export interface TypstDiagnostic {
  message: string;
  severity: "warning" | "error";
  file?: string;
  line?: number;
  column?: number;
  start?: number;
  end?: number;
  formatted: string;
  hints: string[];
  trace: string[];
}

export type CompileResult =
  | {
      diagnostics: TypstDiagnostic[];
      metadata?: TypstDocumentMetadata;
      dependencies?: TypstLoadedFile[];
      format: "pdf";
      output: Uint8Array;
    }
  | {
      diagnostics: TypstDiagnostic[];
      metadata?: TypstDocumentMetadata;
      dependencies?: TypstLoadedFile[];
      format: "png";
      pages: Array<{ page: number; output: Uint8Array }>;
    }
  | {
      diagnostics: TypstDiagnostic[];
      metadata?: TypstDocumentMetadata;
      dependencies?: TypstLoadedFile[];
      format: "svg";
      pages: Array<{ page: number; output: string }>;
    }
  | {
      diagnostics: TypstDiagnostic[];
      metadata?: TypstDocumentMetadata;
      dependencies?: TypstLoadedFile[];
      format: "html";
      output: string;
    }
  | {
      diagnostics: TypstDiagnostic[];
      metadata?: TypstDocumentMetadata;
      dependencies?: TypstLoadedFile[];
      format: "bundle";
      files: Array<{ path: string; data: Uint8Array; mediaType?: string }>;
    };

/** Stateful promise-based Typst compiler. */
export interface TypstCompiler {
  /** Registers a font for subsequent compilations. */
  addFont(data: Uint8Array): Promise<void>;
  /** Adds binary data at a project path. */
  addFile(path: string, data: Uint8Array): Promise<void>;
  /** Adds Typst source at a project path. */
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
  /** Compiles the current virtual project. */
  compile<O extends CompileOptions>(
    options: O & Record<Exclude<keyof O, keyof CompileOptions>, never>,
  ): Promise<
    Extract<
      CompileResult,
      {
        format: (
          O & Record<Exclude<keyof O, keyof CompileOptions>, never>
        )["format"];
      }
    >
  >;
  /** Releases compiler and worker resources. */
  dispose(): Promise<void>;
}
