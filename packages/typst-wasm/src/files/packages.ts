import { parseTarGzip } from "nanotar";
import {
  FileNotFoundError,
  PackageFetchError,
  PackageParseError,
} from "../errors";
import { makeDefaultPackageCache, type PackageCache } from "./cache";
import type { ResolvedLogger } from "../logging";
import type { FetchRequest, TypstFileLoader } from "../compiler/types";

type PackageFetch = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

interface PackageSpec {
  readonly namespace: string;
  readonly name: string;
  readonly version: string;
  readonly filePath: string;
}

export interface PackageManagerOptions {
  fetch?: PackageFetch;
  packageBaseUrl?: string;
  cache?: PackageCache | false;
  memoryPackageCacheCapacity?: number;
  logger?: ResolvedLogger;
}

const DEFAULT_DECODED_CAPACITY = 32;

const parseSpec = (spec: string): PackageSpec => {
  const match = spec.match(
    /^@([a-z0-9-]+)\/([a-z0-9_-]+):([0-9]+\.[0-9]+\.[0-9]+(?:-[a-zA-Z0-9.-]+)?)(?:\/(.+))?$/,
  );
  if (!match)
    throw new PackageParseError(
      spec,
      "Expected format: @namespace/name:version/path where namespace is lowercase alphanumeric with hyphens, name is lowercase alphanumeric with hyphens/underscores, version is semver, and path is the file path.",
    );
  const [, namespace, name, version, filePath = "lib.typ"] = match;
  if (namespace.startsWith("-") || namespace.endsWith("-"))
    throw new PackageParseError(
      spec,
      `Invalid package namespace: "${namespace}" cannot start or end with hyphen`,
    );
  if (name.startsWith("_") || name.endsWith("_"))
    throw new PackageParseError(
      spec,
      `Invalid package name: "${name}" cannot start or end with underscore`,
    );
  return { namespace, name, version, filePath };
};

const getPackageKey = (spec: PackageSpec): string =>
  `@${spec.namespace}/${spec.name}:${spec.version}`;
const packageFetchAttempts = 3;

const validateCapacity = (capacity: number): number => {
  if (
    !Number.isFinite(capacity) ||
    !Number.isInteger(capacity) ||
    capacity < 0
  ) {
    throw new RangeError(
      "memoryPackageCacheCapacity must be a finite, non-negative integer",
    );
  }
  return capacity;
};

const fetchPackage = async (
  fetchImpl: PackageFetch,
  url: string,
): Promise<Response> => {
  let lastError: unknown;
  for (let attempt = 0; attempt < packageFetchAttempts; attempt++) {
    try {
      const response = await fetchImpl(url);
      if (response.ok || attempt === packageFetchAttempts - 1) return response;
      lastError = new Error(`Status ${response.status}`);
    } catch (error) {
      lastError = error;
      if (attempt === packageFetchAttempts - 1) throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, 100 * 2 ** attempt));
  }
  throw lastError;
};

const decodeArchive = async (
  data: Uint8Array,
): Promise<ReadonlyMap<string, Uint8Array>> => {
  const archive = await parseTarGzip(data);
  return new Map(
    archive.flatMap((file) =>
      file.type === "file" && file.data
        ? [[file.name, file.data] as const]
        : [],
    ),
  );
};

export class PackageManager {
  private readonly fetchImpl: PackageFetch;
  private readonly packageBaseUrl: string;
  private readonly cache: PackageCache | undefined;
  private readonly logger: ResolvedLogger | undefined;
  private readonly decodedCapacity: number;
  private readonly inFlightPackages = new Map<
    string,
    Promise<ReadonlyMap<string, Uint8Array>>
  >();
  private readonly decodedPackages = new Map<
    string,
    ReadonlyMap<string, Uint8Array>
  >();
  private disposed = false;

  constructor(options: PackageManagerOptions = {}) {
    this.fetchImpl = options.fetch ?? fetch;
    this.logger = options.logger;
    this.packageBaseUrl =
      options.packageBaseUrl ?? "https://packages.typst.org";
    this.cache =
      options.cache === false
        ? undefined
        : (options.cache ?? makeDefaultPackageCache(options.logger));
    this.decodedCapacity = validateCapacity(
      options.memoryPackageCacheCapacity ?? DEFAULT_DECODED_CAPACITY,
    );
  }

  async getFile(spec: string): Promise<Uint8Array> {
    if (this.disposed) throw new Error("PackageManager has been disposed");
    const parsed = parseSpec(spec);
    const key = getPackageKey(parsed);
    const hit = this.decodedPackages.get(key);
    if (hit) {
      this.decodedPackages.delete(key);
      this.decodedPackages.set(key, hit);
      const file = hit.get(parsed.filePath);
      if (!file) throw new FileNotFoundError(parsed.filePath);
      return file;
    }
    const files = await this.loadPackageDeduped(parsed);
    const file = files.get(parsed.filePath);
    if (!file) throw new FileNotFoundError(parsed.filePath);
    return file;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.decodedPackages.clear();
    this.inFlightPackages.clear();
  }

  private loadPackageDeduped(
    spec: PackageSpec,
  ): Promise<ReadonlyMap<string, Uint8Array>> {
    if (this.disposed)
      return Promise.reject(new Error("PackageManager has been disposed"));
    const key = getPackageKey(spec);
    const existing = this.inFlightPackages.get(key);
    if (existing) return existing;
    const load = this.loadPackage(spec);
    this.inFlightPackages.set(key, load);
    void load
      .finally(() => {
        if (this.inFlightPackages.get(key) === load)
          this.inFlightPackages.delete(key);
      })
      .catch(() => undefined);
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
      let provenance: "cache" | "network" = "cache";
      let cached = false;
      if (this.cache) {
        try {
          const response = await this.cache.match(url);
          if (response) {
            cached = true;
            tarData = new Uint8Array(await response.arrayBuffer());
            try {
              const files = await decodeArchive(tarData);
              this.storeDecoded(getPackageKey(spec), files);
              return files;
            } catch (cause) {
              this.logger?.error(
                "Cached Typst package archive is corrupt; replacing it",
                { url, cause },
              );
            }
          }
        } catch (cause) {
          this.logger?.error("Failed to read cached Typst package", {
            url,
            cause,
          });
        }
      }
      if (!cached || provenance === "cache") {
        const response = await fetchPackage(this.fetchImpl, url);
        if (!response.ok) throw new Error(`Status ${response.status}`);
        tarData = new Uint8Array(await response.arrayBuffer());
        provenance = "network";
      }
      if (!tarData) throw new Error("Package archive was not loaded");
      const files = await decodeArchive(tarData);
      if (this.cache && provenance === "network" && !this.disposed) {
        try {
          await this.cache.put(
            url,
            new Response(tarData.slice().buffer, {
              headers: {
                "Cache-Control": "public, max-age=31536000, immutable",
                "Content-Type": "application/gzip",
              },
            }),
          );
        } catch (cause) {
          this.logger?.error("Failed to write Typst package cache", {
            url,
            cause,
          });
        }
      }
      this.storeDecoded(getPackageKey(spec), files);
      return files;
    } catch (cause) {
      throw new PackageFetchError(url, cause);
    }
  }

  private storeDecoded(
    key: string,
    files: ReadonlyMap<string, Uint8Array>,
  ): void {
    if (this.disposed || this.decodedCapacity === 0) return;
    this.decodedPackages.delete(key);
    this.decodedPackages.set(key, files);
    while (this.decodedPackages.size > this.decodedCapacity) {
      const oldest = this.decodedPackages.keys().next().value;
      if (oldest === undefined) break;
      this.decodedPackages.delete(oldest);
    }
  }
}

export const makePackageFileLoader =
  (packageManager: PackageManager): TypstFileLoader =>
  async (request: FetchRequest) => {
    if (request.kind !== "package") return null;
    return {
      data: await packageManager.getFile(request.path),
      resolvedPath: request.path,
    };
  };
