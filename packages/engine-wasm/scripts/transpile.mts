#!/usr/bin/env node
import { transpile } from "@bytecodealliance/jco";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";

type Backend = "worker" | "jspi";
const base64Cutoff = 0;

const backend: Backend | undefined = process.argv[2] as Backend | undefined;
if (backend !== "worker" && backend !== "jspi") {
  throw new Error("usage: transpile.mts <worker|jspi>");
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const componentPath = process.env.COMPONENT_PATH
  ? resolve(process.env.COMPONENT_PATH)
  : resolve(root, "target/component/typst_wasm.component.wasm");
const outDir = process.env.OUT_DIR
  ? resolve(process.env.OUT_DIR, backend)
  : resolve(root, "dist", backend);

const options = {
  name: "engine",
  instantiation: "async",
  wasiShim: false,
  // Keep the tiny JCO helper modules in the generated JavaScript while
  // leaving the main Typst engine as a separate streaming/loadable asset.
  base64Cutoff,
  ...(backend === "jspi" && {
    asyncMode: "jspi",
    asyncImports: ["typst:engine/host#fetch"],
    asyncExports: ["typst:engine/api#[method]compiler.compile"],
  }),
};

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

try {
  const { files } = await transpile(readFileSync(componentPath), options);

  for (const [relativePath, content] of Object.entries(files)) {
    const destination = join(outDir, relativePath);
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, content);
  }
  if (backend === "jspi") {
    const coreModules = Object.keys(files)
      .filter((file) => file.endsWith(".wasm"))
      .sort();
    await writeFile(
      join(outDir, "core-modules.json"),
      `${JSON.stringify(coreModules, null, 2)}\n`,
    );
  }
  console.log(`${backend} transpile complete:`, Object.keys(files).join(", "));
} catch (error) {
  console.error(`${backend} transpile failed:`, error);
  process.exit(1);
}
