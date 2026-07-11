import { FetchError, FileNotFoundError } from "../errors";
import type {
  TypstFileKind,
  TypstFileLoad,
  TypstFileLoader,
  TypstFileLoaderResult,
  TypstFileRequest,
  TypstLoadedFile,
} from "../compiler/types";

export type FetchImpl = (
  input: Parameters<typeof fetch>[0],
  init?: Parameters<typeof fetch>[1],
) => ReturnType<typeof fetch>;

const packagePathRE =
  /^@[a-z0-9-]+\/[a-z0-9_-]+:[0-9]+\.[0-9]+\.[0-9]+(?:-[a-zA-Z0-9.-]+)?\/.+$/;
const urlPathRE = /^https?:\/\//i;

export const classifyTypstFilePath = (path: string): TypstFileKind => {
  if (packagePathRE.test(path)) return "package";
  if (urlPathRE.test(path)) return "url";
  return "project";
};

const isBytes = (value: TypstFileLoaderResult): value is Uint8Array =>
  value instanceof Uint8Array;

const normalizeLoad = (
  value: Exclude<TypstFileLoaderResult, null | undefined>,
) => (isBytes(value) ? { data: value } : value);

export class FileLoaderManager {
  private readonly loadedFiles = new Map<string, TypstLoadedFile>();

  constructor(private readonly loaders: TypstFileLoader[]) {}

  resetTrace(): void {
    this.loadedFiles.clear();
  }

  getTrace(): TypstLoadedFile[] {
    return [...this.loadedFiles.values()];
  }

  async loadFile(pathOrRequest: string | TypstFileRequest): Promise<TypstFileLoad> {
    const request: TypstFileRequest =
      typeof pathOrRequest === "string"
        ? { path: pathOrRequest, kind: classifyTypstFilePath(pathOrRequest) }
        : pathOrRequest;

    for (const loader of this.loaders) {
      const result = await loader.load(request);
      if (result == null) continue;

      const normalized = normalizeLoad(result);
      this.record(request, normalized);
      return normalized;
    }

    throw new FileNotFoundError(request.path);
  }

  async load(pathOrRequest: string | TypstFileRequest): Promise<Uint8Array> {
    return (await this.loadFile(pathOrRequest)).data;
  }

  private record(request: TypstFileRequest, load: TypstFileLoad): void {
    const dependency: TypstLoadedFile = {
      path: request.path,
      kind: request.kind,
      resolvedPath: load.resolvedPath,
      mediaType: load.mediaType,
    };
    const key = [
      dependency.kind,
      dependency.path,
      dependency.resolvedPath ?? "",
    ].join("\0");

    if (!this.loadedFiles.has(key)) {
      this.loadedFiles.set(key, dependency);
    }
  }
}

export class FetchFileLoader implements TypstFileLoader {
  constructor(private readonly fetchImpl: FetchImpl = fetch) {}

  async load(request: TypstFileRequest): Promise<TypstFileLoad | null> {
    if (request.kind === "package") return null;

    try {
      const response = await this.fetchImpl(request.path);
      if (!response.ok) throw new Error(`Status ${response.status}`);
      const mediaType = response.headers.get("content-type") ?? undefined;

      return {
        data: new Uint8Array(await response.arrayBuffer()),
        resolvedPath: response.url || undefined,
        mediaType,
      };
    } catch (cause) {
      throw new FetchError(request.path, cause);
    }
  }
}
