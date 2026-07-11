import { parseTarGzip } from "nanotar";
import {
  FileNotFoundError,
  PackageFetchError,
  PackageParseError,
} from "../errors";
import { makeDefaultPackageCache, type PackageCache } from "./cache";
import type {
  TypstFileLoad,
  TypstFileLoader,
  TypstFileRequest,
} from "../compiler/types";

interface PackageSpec {
  readonly namespace: string;
  readonly name: string;
  readonly version: string;
  readonly filePath: string;
}

export interface PackageManagerOptions {
  fetch?: typeof fetch;
  packageBaseUrl?: string;
  cache?: PackageCache | false;
  memoryPackageCacheCapacity?: number;
}

const parseSpec = (spec: string): PackageSpec => {
  const match = spec.match(
    /^@([a-z0-9-]+)\/([a-z0-9_-]+):([0-9]+\.[0-9]+\.[0-9]+(?:-[a-zA-Z0-9.-]+)?)(?:\/(.+))?$/,
  );

  if (!match) {
    throw new PackageParseError(
      spec,
      "Expected format: @namespace/name:version/path where namespace is lowercase alphanumeric with hyphens, name is lowercase alphanumeric with hyphens/underscores, version is semver, and path is the file path.",
    );
  }

  const [, namespace, name, version, filePath = "lib.typ"] = match;

  if (namespace.startsWith("-") || namespace.endsWith("-")) {
    throw new PackageParseError(
      spec,
      `Invalid package namespace: "${namespace}" cannot start or end with hyphen`,
    );
  }

  if (name.startsWith("_") || name.endsWith("_")) {
    throw new PackageParseError(
      spec,
      `Invalid package name: "${name}" cannot start or end with underscore`,
    );
  }

  return { namespace, name, version, filePath };
};

const getPackageKey = (spec: PackageSpec): string =>
  `@${spec.namespace}/${spec.name}:${spec.version}`;

const packageFetchAttempts = 3;

const fetchPackage = async (
  fetchImpl: typeof fetch,
  url: string,
): Promise<Response> => {
  let lastError: unknown;

  for (let attempt = 0; attempt < packageFetchAttempts; attempt++) {
    try {
      const response = await fetchImpl(url);
      if (response.ok || attempt === packageFetchAttempts - 1) {
        return response;
      }
      lastError = new Error(`Status ${response.status}`);
    } catch (error) {
      lastError = error;
      if (attempt === packageFetchAttempts - 1) throw error;
    }

    await new Promise((resolve) => setTimeout(resolve, 100 * 2 ** attempt));
  }

  throw lastError;
};

export class PackageManager {
  private readonly fetchImpl: typeof fetch;
  private readonly packageBaseUrl: string;
  private readonly cache: PackageCache | undefined;
  private readonly loadedPackages = new Map<
    string,
    Promise<ReadonlyMap<string, Uint8Array>>
  >();

  constructor(options: PackageManagerOptions = {}) {
    this.fetchImpl = options.fetch ?? fetch;
    this.packageBaseUrl =
      options.packageBaseUrl ?? "https://packages.typst.org";
    this.cache =
      options.cache === false
        ? undefined
        : (options.cache ?? makeDefaultPackageCache());
  }

  async getFile(spec: string): Promise<Uint8Array> {
    const parsed = parseSpec(spec);
    const files = await this.loadPackageDeduped(parsed);
    const file = files.get(parsed.filePath);
    if (!file) throw new FileNotFoundError(parsed.filePath);
    return file;
  }

  private loadPackageDeduped(
    spec: PackageSpec,
  ): Promise<ReadonlyMap<string, Uint8Array>> {
    const packageKey = getPackageKey(spec);
    const existing = this.loadedPackages.get(packageKey);
    if (existing) return existing;

    const load = this.loadPackage(spec);
    this.loadedPackages.set(packageKey, load);
    void load.catch(() => {
      if (this.loadedPackages.get(packageKey) === load) {
        this.loadedPackages.delete(packageKey);
      }
    });
    return load;
  }

  private async loadPackage(
    spec: PackageSpec,
  ): Promise<ReadonlyMap<string, Uint8Array>> {
    const url = new URL(
      `${spec.namespace}/${spec.name}-${spec.version}.tar.gz`,
      `${this.packageBaseUrl.replace(/\/$/, "")}/`,
    ).toString();

    try {
      let tarData: Uint8Array | undefined;
      if (this.cache) {
        const cached = await this.cache.match(url);
        if (cached) {
          try {
            tarData = new Uint8Array(await cached.arrayBuffer());
          } catch (cause) {
            globalThis.console.error("Failed to read cached Typst package", {
              url,
              cause,
            });
          }
        }
      }

      if (!tarData) {
        const response = await fetchPackage(this.fetchImpl, url);
        if (!response.ok) throw new Error(`Status ${response.status}`);
        tarData = new Uint8Array(await response.arrayBuffer());
      }

      let files: ReadonlyMap<string, Uint8Array>;
      try {
        const archive = await parseTarGzip(tarData);
        files = new Map(
          archive.flatMap((file) =>
            file.type === "file" && file.data
              ? [[file.name, file.data] as const]
              : [],
          ),
        );
      } catch (cause) {
        // A corrupt cached response should be replaced by a fresh download.
        if (!this.cache || !tarData) {
          throw new Error("Failed to parse package archive", { cause });
        }
        const response = await fetchPackage(this.fetchImpl, url);
        if (!response.ok) {
          throw new Error(`Status ${response.status}`, { cause });
        }
        tarData = new Uint8Array(await response.arrayBuffer());
        const archive = await parseTarGzip(tarData);
        files = new Map(
          archive.flatMap((file) =>
            file.type === "file" && file.data
              ? [[file.name, file.data] as const]
              : [],
          ),
        );
      }

      if (this.cache && tarData) {
        await this.cache.put(
          url,
          new Response(tarData, {
            headers: {
              "Cache-Control": "public, max-age=31536000, immutable",
              "Content-Type": "application/gzip",
            },
          }),
        );
      }
      return files;
    } catch (cause) {
      throw new PackageFetchError(url, cause);
    }
  }
}

export class PackageFileLoader implements TypstFileLoader {
  constructor(private readonly packageManager: PackageManager) {}

  async load(request: TypstFileRequest): Promise<TypstFileLoad | null> {
    if (request.kind !== "package") return null;

    return {
      data: await this.packageManager.getFile(request.path),
      resolvedPath: request.path,
    };
  }
}
