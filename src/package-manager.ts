import { Effect } from "effect";
import { parseTarGzip } from "nanotar";
import { CacheStorageService } from "./cache-abstraction";
import { FileNotFoundError, PackageFetchError, PackageParseError } from "./errors";

interface PackageSpec {
  readonly namespace: string;
  readonly name: string;
  readonly version: string;
  readonly filePath: string;
}

const parseSpec = (spec: string): Effect.Effect<PackageSpec, PackageParseError> =>
  Effect.gen(function* () {
    const match = spec.match(/^@([a-z0-9-]+)\/([a-z0-9_-]+):([0-9]+\.[0-9]+\.[0-9]+(?:-[a-zA-Z0-9.-]+)?)\/(.+)$/);

    if (!match) {
      return yield* Effect.fail(
        new PackageParseError({
          spec,
          message: "Expected format: @namespace/name:version/path where namespace is lowercase alphanumeric with hyphens, name is lowercase alphanumeric with hyphens/underscores, version is semver (e.g., 0.4.2), and path is the file path.",
        }),
      );
    }

    const [, namespace, name, version, filePath] = match;

    if (namespace.startsWith("-") || namespace.endsWith("-")) {
      return yield* Effect.fail(
        new PackageParseError({
          spec,
          message: `Invalid package namespace: "${namespace}" cannot start or end with hyphen`,
        }),
      );
    }

    if (name.startsWith("_") || name.endsWith("_")) {
      return yield* Effect.fail(
        new PackageParseError({
          spec,
          message: `Invalid package name: "${name}" cannot start or end with underscore`,
        }),
      );
    }

    return { namespace, name, version, filePath };
  });

const getCacheKey = (spec: PackageSpec): string => `@${spec.namespace}/${spec.name}:${spec.version}/${spec.filePath}`;

const getFileCacheKey = (spec: PackageSpec, filePath: string): string => `@${spec.namespace}/${spec.name}:${spec.version}/${filePath}`;

const getPackageKey = (spec: PackageSpec): string => `@${spec.namespace}/${spec.name}:${spec.version}`;

export type PackageManagerService = {
  readonly getFile: (spec: string) => Effect.Effect<Uint8Array, PackageParseError | PackageFetchError | FileNotFoundError>;
};

export class PackageManager extends Effect.Service<PackageManagerService>()("PackageManager", {
  accessors: true,
  effect: Effect.gen(function* () {
    const cache = yield* CacheStorageService;
    const loadedPackages = new Set<string>();

    const loadPackage = (spec: PackageSpec): Effect.Effect<void, PackageFetchError> =>
      Effect.gen(function* () {
        const packageKey = getPackageKey(spec);
        const url = `https://packages.typst.org/${spec.namespace}/${spec.name}-${spec.version}.tar.gz`;

        const tarData = yield* Effect.tryPromise({
          try: async () => {
            const response = await fetch(url);
            if (!response.ok) {
              throw new Error(`Failed to fetch package: ${url}`);
            }
            return new Uint8Array(await response.arrayBuffer());
          },
          catch: (cause) => new PackageFetchError({ url, cause }),
        });

        const files = yield* Effect.tryPromise({
          try: () => parseTarGzip(tarData),
          catch: (cause) => new PackageFetchError({ url, cause }),
        });

        for (const file of files) {
          if (file.type === "file" && file.data) {
            const cacheKey = getFileCacheKey(spec, file.name);
            yield* cache.set(cacheKey, file.data);
          }
        }

        loadedPackages.add(packageKey);
      });

    return {
      getFile: (spec: string): Effect.Effect<Uint8Array, PackageParseError | PackageFetchError | FileNotFoundError> =>
        Effect.gen(function* () {
          const parsed = yield* parseSpec(spec);
          const cacheKey = getCacheKey(parsed);

          const cached = yield* cache.get(cacheKey);
          if (cached) {
            return cached;
          }

          const packageKey = getPackageKey(parsed);
          if (!loadedPackages.has(packageKey)) {
            yield* loadPackage(parsed);
          }

          const file = yield* cache.get(cacheKey);
          if (!file) {
            return yield* Effect.fail(new FileNotFoundError({ filePath: parsed.filePath }));
          }
          return file;
        }),
    };
  }),
  dependencies: [CacheStorageService.Default],
}) {}
