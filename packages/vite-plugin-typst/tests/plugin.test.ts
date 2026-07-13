import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createWorkerThread } from "typst-wasm/node";
import typst from "@typst-wasm/vite-plugin-typst";
import { describe, expect, test } from "vitest";
import { buildFixture, fixturePath, getChunk, importChunk } from "./helpers";

declare global {
  var __typstFixture: {
    html: string;
    metadata: { title?: string; author: string[] };
    dependencies: Array<{ path: string; kind: string }>;
    document: { html: string };
  };
}

const plugin = () =>
  typst({
    backend: "worker",
    worker: () =>
      createWorkerThread(
        new URL(import.meta.resolve("typst-wasm/worker/node")),
      ),
    getCoreModule: async (name) =>
      WebAssembly.compile(
        await readFile(
          new URL(
            import.meta.resolve(`@typst-wasm/engine-wasm/worker/${name}`),
          ),
        ),
      ),
  });

describe("vite-plugin-typst fixtures", () => {
  test("builds a typst import into a JS module", async () => {
    const build = await buildFixture("basic", plugin());
    try {
      const main = getChunk(build, (chunk) => chunk.isEntry);

      expect(main.code).toContain("Hello from Typst");
      expect(main.code).toContain("metadata");
      expect(main.code).toContain("dependencies");
      expect(main.code).toContain("Typst Fixture");

      await importChunk(build, main);
      const module = globalThis.__typstFixture;
      expect(module.html).toContain("Hello from Typst");
      expect(module.document.html).toBe(module.html);
      expect(module.metadata.title).toBe("Typst Fixture");
      expect(module.metadata.author).toContain("Typst Wasm");
      expect(module.dependencies.length).toBeGreaterThan(0);
      expect(
        module.dependencies.every((dependency) => dependency.kind.length > 0),
      ).toBe(true);
    } finally {
      await build.cleanup();
    }
  });

  test("rebuilds after a Typst dependency changes", async () => {
    const dependencyPath = fixturePath("basic/dep.typ");
    const originalDependency = await readFile(dependencyPath, "utf8");
    let first: Awaited<ReturnType<typeof buildFixture>> | undefined;
    let second: Awaited<ReturnType<typeof buildFixture>> | undefined;
    try {
      first = await buildFixture("basic", plugin());
      await importChunk(
        first,
        getChunk(first, (chunk) => chunk.isEntry),
      );
      expect(globalThis.__typstFixture.html).toContain("Dependency");
      await writeFile(dependencyPath, "#let fixture-dependency = [Changed]");
      second = await buildFixture("basic", plugin());
      await importChunk(
        second,
        getChunk(second, (chunk) => chunk.isEntry),
      );
      expect(globalThis.__typstFixture.html).toContain("Changed");
      expect(globalThis.__typstFixture.html).not.toContain(">Dependency<");
    } finally {
      await first?.cleanup();
      await second?.cleanup();
      await writeFile(dependencyPath, originalDependency);
    }
  });

  test("reports Typst compile errors with source context", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "typst-vite-error-"));
    await writeFile(path.join(root, "main.js"), 'import "./broken.typ";');
    await writeFile(path.join(root, "broken.typ"), "#let = invalid");
    try {
      await expect(buildFixture("basic", plugin(), { root })).rejects.toThrow(
        /broken\.typ|error|expected/i,
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
