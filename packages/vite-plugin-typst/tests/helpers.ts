import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build, type Plugin, type Rollup } from "vite";

const dirname = path.dirname(fileURLToPath(import.meta.url));
export const fixturesDir = path.resolve(dirname, "fixtures");

export const fixturePath = (fixture: string): string =>
  path.resolve(fixturesDir, fixture);

export type ViteOutput = Rollup.OutputBundle[string];
export type ViteChunk = Extract<ViteOutput, { type: "chunk" }>;

export interface FixtureBuild {
  output: Rollup.OutputBundle[string][];
  cleanup(): Promise<void>;
}

export const buildFixture = async (
  fixture: string,
  plugins: Plugin | Plugin[],
): Promise<FixtureBuild> => {
  const outDir = await mkdtemp(path.join(tmpdir(), "vite-plugin-typst-"));
  const result = await build({
    root: fixturePath(fixture),
    logLevel: "silent",
    plugins: Array.isArray(plugins) ? plugins : [plugins],
    build: {
      outDir,
      emptyOutDir: true,
      write: false,
      rollupOptions: {
        input: path.resolve(fixturePath(fixture), "main.js"),
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
    cleanup: () => rm(outDir, { recursive: true, force: true }),
  };
};

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
