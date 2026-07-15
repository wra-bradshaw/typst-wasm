import { readFile } from "node:fs/promises";
import { createTypstCompiler, createWorkerThread } from "typst-wasm/node";
import * as engine from "typst-wasm/engine";

const compiler = await createTypstCompiler({
  backend: "auto",
  engine,
  getCoreModule: async (name: string) =>
    WebAssembly.compile(
      await readFile(
        new URL(import.meta.resolve(`typst-wasm/engine/worker/${name}`)),
      ),
    ),
  worker: () =>
    createWorkerThread(
      new URL(import.meta.resolve("typst-wasm/worker/worker-thread")),
    ),
});

try {
  await compiler.addFonts(
    readFile(
      new URL(import.meta.resolve("@typst-wasm/fonts/NewCMMath-Regular.otf")),
    ),
  );

  await compiler.addSource(
    "main.typ",
    "= Hello from Node\n\nThis document was compiled with typst-wasm.",
  );
  const result = await compiler.compile({ main: "main.typ", format: "svg" });
  console.log(result.pages[0]?.output);
} finally {
  await compiler.dispose();
}
