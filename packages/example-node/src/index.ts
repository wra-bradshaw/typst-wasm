import { readFile } from "node:fs/promises";
import { createTypstCompiler } from "typst-wasm";
import { createWorkerThread } from "typst-wasm/worker/node";

const compiler = await createTypstCompiler({
  backend: "auto",
  coreModules: {
    "engine.core.wasm": WebAssembly.compile(
      await readFile(
        new URL(import.meta.resolve("typst-wasm/engine/engine.core.wasm")),
      ),
    ),
    "engine.core2.wasm": WebAssembly.compile(
      await readFile(
        new URL(import.meta.resolve("typst-wasm/engine/engine.core2.wasm")),
      ),
    ),
    "engine.core3.wasm": WebAssembly.compile(
      await readFile(
        new URL(import.meta.resolve("typst-wasm/engine/engine.core3.wasm")),
      ),
    ),
  },
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
