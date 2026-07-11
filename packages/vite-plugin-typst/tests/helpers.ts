import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build, type Plugin, type Rollup } from "vite";

const dirname = path.dirname(fileURLToPath(import.meta.url));
export const fixturesDir = path.resolve(dirname, "fixtures");

export const fixturePath = (fixture: string): string =>
  path.resolve(fixturesDir, fixture);

export type ViteOutput = Rollup.OutputBundle[string];
export type ViteChunk = Extract<ViteOutput, { type: "chunk" }>;

export interface FixtureBuild {
  output: Rollup.OutputBundle[string][];
  outDir: string;
  cleanup(): Promise<void>;
}

export const buildFixture = async (
  fixture: string,
  plugins: Plugin | Plugin[],
  options: { root?: string } = {},
): Promise<FixtureBuild> => {
  const outDir = await mkdtemp(path.join(tmpdir(), "vite-plugin-typst-"));
  const root = options.root ?? fixturePath(fixture);
  const result = await build({
    root,
    logLevel: "silent",
    plugins: Array.isArray(plugins) ? plugins : [plugins],
    build: {
      outDir,
      emptyOutDir: true,
      write: true,
      rollupOptions: {
        input: path.resolve(root, "main.js"),
      },
    },
  });

  if (!("output" in result)) {
    throw new Error("Expected Vite build to return output");
  }

  const output = result.output;
  if (!output) {
    throw new Error("Expected Vite build output");
  }

  return {
    output: [...output],
    outDir,
    cleanup: () => rm(outDir, { recursive: true, force: true }),
  };
};

export const importChunk = async <T = Record<string, unknown>>(
  build: FixtureBuild,
  chunk: ViteChunk,
): Promise<T> =>
  (await import(
    `${pathToFileURL(path.join(build.outDir, chunk.fileName))}?t=${Date.now()}`
  )) as T;

export const getChunk = (
  build: FixtureBuild,
  predicate: (chunk: ViteChunk) => boolean,
): ViteChunk => {
  const chunk = build.output.find(
    (item): item is ViteChunk => item.type === "chunk" && predicate(item),
  );

  if (!chunk) {
    throw new Error("Expected chunk in Vite output");
  }

  return chunk;
};
