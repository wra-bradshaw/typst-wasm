import { parseTarGzip } from "nanotar";
import {
  FileNotFoundError,
  PackageFetchError,
  PackageParseError,
} from "./errors";
import { makeDefaultPackageCache } from "./cache-abstraction";
import type {
  PackageCache,
  TypstFileLoad,
  TypstFileLoader,
  TypstFileRequest,
} from "./types";

interface PackageSpec {
  readonly namespace: string;
  readonly name: string;
  readonly version: string;
  readonly filePath: string;
}

export interface PackageManagerOptions {
  fetch?: typeof fetch;
  packageBaseUrl?: string;
  cache?: PackageCache;
  memoryPackageCacheCapacity?: number;
}

const parseSpec = (spec: string): PackageSpec => {
  const match = spec.match(
    /^@([a-z0-9-]+)\/([a-z0-9_-]+):([0-9]+\.[0-9]+\.[0-9]+(?:-[a-zA-Z0-9.-]+)?)\/(.+)$/,
  );

  if (!match) {
    throw new PackageParseError(
      spec,
      "Expected format: @namespace/name:version/path where namespace is lowercase alphanumeric with hyphens, name is lowercase alphanumeric with hyphens/underscores, version is semver, and path is the file path.",
    );
  }

  const [, namespace, name, version, filePath] = match;

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

const getFileCacheKey = (spec: PackageSpec, filePath: string): string =>
  `@${spec.namespace}/${spec.name}:${spec.version}/${filePath}`;
const getCacheKey = (spec: PackageSpec): string =>
  getFileCacheKey(spec, spec.filePath);
const getPackageKey = (spec: PackageSpec): string =>
  `@${spec.namespace}/${spec.name}:${spec.version}`;

export class PackageManager {
  private readonly fetchImpl: typeof fetch;
  private readonly packageBaseUrl: string;
  private readonly cache: PackageCache;
  private readonly loadedPackages = new Set<string>();
  private readonly loadingPackages = new Map<string, Promise<void>>();

  constructor(options: PackageManagerOptions = {}) {
    this.fetchImpl = options.fetch ?? fetch;
    this.packageBaseUrl =
      options.packageBaseUrl ?? "https://packages.typst.org";
    this.cache =
      options.cache ??
      makeDefaultPackageCache(options.memoryPackageCacheCapacity);
  }

  async getFile(spec: string): Promise<Uint8Array> {
    const parsed = parseSpec(spec);
    const cacheKey = getCacheKey(parsed);
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const packageKey = getPackageKey(parsed);
    if (!this.loadedPackages.has(packageKey)) {
      await this.loadPackageDeduped(parsed);
    }

    const file = await this.cache.get(cacheKey);
    if (!file) {
      throw new FileNotFoundError(parsed.filePath);
    }
    return file;
  }

  private async loadPackageDeduped(spec: PackageSpec): Promise<void> {
    const packageKey = getPackageKey(spec);
    const existing = this.loadingPackages.get(packageKey);
    if (existing) {
      await existing;
      return;
    }

    const load = this.loadPackage(spec);
    this.loadingPackages.set(packageKey, load);
    try {
      await load;
      this.loadedPackages.add(packageKey);
    } finally {
      this.loadingPackages.delete(packageKey);
    }
  }

  private async loadPackage(spec: PackageSpec): Promise<void> {
    const url = `${this.packageBaseUrl}/${spec.namespace}/${spec.name}-${spec.version}.tar.gz`;

    try {
      const response = await this.fetchImpl(url);
      if (!response.ok) {
        throw new Error(`Status ${response.status}`);
      }

      const tarData = new Uint8Array(await response.arrayBuffer());
      const files = await parseTarGzip(tarData);

      await Promise.all(
        files.map(async (file) => {
          if (file.type === "file" && file.data) {
            await this.cache.set(getFileCacheKey(spec, file.name), file.data);
          }
        }),
      );
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
