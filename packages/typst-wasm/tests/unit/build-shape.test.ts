import { access, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const packageRoot = resolve(import.meta.dirname, "../..");

const fileExists = async (path: string): Promise<boolean> => {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
};

describe("build shape", () => {
  it("keeps the Node worker as a stable standalone entry", async () => {
    const config = await readFile(
      join(packageRoot, "tsdown.config.ts"),
      "utf8",
    );

    expect(config).toContain('"worker/node": "./src/worker/node.ts"');
    expect(config).toContain('"node:worker_threads"');
  });

  it("emits a standalone Node worker and references it from the Node entry", async () => {
    const distRoot = join(packageRoot, "dist");

    if (!(await fileExists(join(distRoot, "index.js")))) {
      return;
    }

    await expect(access(join(distRoot, "worker/node.js"))).resolves.toBe(
      undefined,
    );

    const nodeEntry = await readFile(join(distRoot, "index.js"), "utf8");
    expect(nodeEntry).toContain("./worker/node.js");
  });
});
