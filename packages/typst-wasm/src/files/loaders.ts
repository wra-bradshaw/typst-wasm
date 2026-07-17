import { FetchError, FileNotFoundError } from "../errors";
import type {
  FetchedFile,
  FetchRequest,
  TypstFileLoader,
} from "../compiler/types";

export type FetchImpl = (
  input: Parameters<typeof fetch>[0],
  init?: Parameters<typeof fetch>[1],
) => ReturnType<typeof fetch>;

export class FileLoaderManager {
  private loaders: TypstFileLoader[];

  constructor(loaders: TypstFileLoader[]) {
    this.loaders = loaders;
  }

  dispose(): void {
    this.loaders = [];
  }

  async load(request: FetchRequest): Promise<FetchedFile> {
    for (const loader of this.loaders) {
      const result = await loader(request);
      if (result) return result;
    }
    throw new FileNotFoundError(request.path);
  }
}

export const makeFetchFileLoader =
  (fetchImpl: FetchImpl = fetch): TypstFileLoader =>
  async (request) => {
    if (request.kind === "package") return null;

    try {
      const response = await fetchImpl(request.path);
      if (!response.ok) throw new Error(`Status ${response.status}`);
      return {
        data: new Uint8Array(await response.arrayBuffer()),
        resolvedPath: response.url || undefined,
        mediaType: response.headers.get("content-type") ?? undefined,
      };
    } catch (cause) {
      throw new FetchError(request.path, cause);
    }
  };
