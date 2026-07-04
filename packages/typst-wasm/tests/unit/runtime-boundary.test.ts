import { readFile, readdir } from "node:fs/promises";
import { dirname, join, normalize, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const srcRoot = resolve(import.meta.dirname, "../../src");

const readSourceFiles = async (dir: string): Promise<string[]> => {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) return readSourceFiles(path);
      if (
        entry.isFile() &&
        /\.(?:ts|tsx)$/.test(entry.name) &&
        !entry.name.endsWith(".test.ts") &&
        !entry.name.endsWith(".d.ts")
      ) {
        return [path];
      }
      return [];
    }),
  );

  return files.flat();
};

const importPattern =
  /(?:import|export)\s+(?:[^'"]*?\s+from\s+)?["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)/g;

const importsFrom = (source: string): string[] =>
  [...source.matchAll(importPattern)].map((match) => match[1] ?? match[2]);

const toSourcePath = (specifier: string, importer: string): string | null => {
  if (!specifier.startsWith(".")) return null;

  const withoutQuery = specifier.split("?")[0];
  const base = resolve(dirname(importer), withoutQuery);
  if (/\.[cm]?[jt]sx?$/.test(base)) return normalize(base);

  return normalize(`${base}.ts`);
};

const collectGraph = async (entry: string): Promise<Set<string>> => {
  const visited = new Set<string>();
  const queue = [entry];

  while (queue.length > 0) {
    const file = queue.pop();
    if (!file || visited.has(file)) continue;

    visited.add(file);
    const source = await readFile(file, "utf8");
    for (const specifier of importsFrom(source)) {
      const next = toSourcePath(specifier, file);
      if (next?.startsWith(srcRoot)) {
        queue.push(next);
      }
    }
  }

  return visited;
};

describe("runtime boundary", () => {
  it("keeps runtime-specific imports out of shared modules", async () => {
    const sourceFiles = await readSourceFiles(srcRoot);
    const sharedFiles = sourceFiles.filter((file) => {
      const rel = relative(srcRoot, file);
      return (
        !rel.startsWith("runtime/") &&
        ![
          "index.ts",
          "index.browser.ts",
          "worker/node.ts",
          "worker/browser.ts",
        ].includes(rel)
      );
    });

    const violations: string[] = [];
    for (const file of sharedFiles) {
      const source = await readFile(file, "utf8");
      if (
        /runtime\/(?:browser|node)|node:|\?worker|\?init|import\.meta\.resolve/.test(
          source,
        )
      ) {
        violations.push(relative(srcRoot, file));
      }
    }

    expect(violations).toEqual([]);
  });

  it("keeps the browser entry away from node runtime helpers", async () => {
    const graph = await collectGraph(join(srcRoot, "index.browser.ts"));
    const reachable = [...graph].map((file) =>
      relative(srcRoot, file).replaceAll("\\", "/"),
    );

    expect(reachable).not.toContain("runtime/node.ts");
  });

  it("keeps public runtime entries free of hidden worker asset imports", async () => {
    const browserRuntime = await readFile(
      join(srcRoot, "runtime/browser.ts"),
      "utf8",
    );
    const nodeRuntime = await readFile(
      join(srcRoot, "runtime/node.ts"),
      "utf8",
    );
    const workerdRuntime = await readFile(
      join(srcRoot, "runtime/workerd.ts"),
      "utf8",
    );

    expect(browserRuntime).not.toMatch(/\?worker|worker\/browser/);
    expect(nodeRuntime).not.toContain("./worker/node.js");
    expect(workerdRuntime).not.toMatch(/node:|\?worker|worker_threads/);
  });

  it("keeps runtime-bound backend capability wrappers at the public entries", async () => {
    const nodeEntry = await readFile(join(srcRoot, "index.ts"), "utf8");
    const browserEntry = await readFile(
      join(srcRoot, "index.browser.ts"),
      "utf8",
    );
    const browserRuntime = await readFile(
      join(srcRoot, "runtime/browser.ts"),
      "utf8",
    );

    expect(nodeEntry).toContain("nodeRuntime.supportsWorkerBackend(options)");
    expect(nodeEntry).toContain("nodeRuntime.supportsJspiBackend()");
    expect(browserEntry).toContain(
      "browserRuntime.supportsWorkerBackend(options)",
    );
    expect(browserEntry).toContain("browserRuntime.supportsJspiBackend()");
    expect(browserRuntime).toContain('typeof Worker !== "undefined"');
  });
});
