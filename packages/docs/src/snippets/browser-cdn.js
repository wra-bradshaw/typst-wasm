// docs:start compiler
import { createTypstCompiler } from "https://cdn.jsdelivr.net/npm/typst-wasm@__TYPST_WASM_VERSION__/+esm";
import { createWebWorker } from "https://cdn.jsdelivr.net/npm/typst-wasm@__TYPST_WASM_VERSION__/dist/worker/browser.js";

const typstCdn =
  "https://cdn.jsdelivr.net/npm/typst-wasm@__TYPST_WASM_VERSION__/dist";
const fontsCdn =
  "https://cdn.jsdelivr.net/npm/@typst-wasm/fonts@__TYPST_WASM_VERSION__/dist/files";

// A Worker must normally be same-origin with its page. This blob module
// imports the worker entry from the CDN while giving Worker a same-origin URL.
const workerEntry = `${typstCdn}/worker/web-worker.js`;
const workerUrl = URL.createObjectURL(
  new Blob([`import ${JSON.stringify(workerEntry)};`], {
    type: "text/javascript",
  }),
);

const compiler = await createTypstCompiler({
  backend: "auto",
  worker: () => createWebWorker(workerUrl),
  coreModules: {
    "engine.core.wasm": WebAssembly.compileStreaming(
      fetch(`${typstCdn}/engine/engine.core.wasm`),
    ),
    "engine.core2.wasm": WebAssembly.compileStreaming(
      fetch(`${typstCdn}/engine/engine.core2.wasm`),
    ),
    "engine.core3.wasm": WebAssembly.compileStreaming(
      fetch(`${typstCdn}/engine/engine.core3.wasm`),
    ),
  },
});
// docs:end compiler

// docs:start fonts
const fontNames = [
  "NewCMMath-Regular.otf",
  "LibertinusSerif-Regular.otf",
];

await compiler.addFonts(
  ...fontNames.map(
    async (font) =>
      new Uint8Array(await (await fetch(`${fontsCdn}/${font}`)).arrayBuffer()),
  ),
);
// docs:end fonts

// docs:start compile
await compiler.addSource("main.typ", "= Hello from Typst");
const result = await compiler.compile({
  main: "main.typ",
  format: "html",
});
document.querySelector("#output").innerHTML = result.output;

await compiler.dispose();
URL.revokeObjectURL(workerUrl);
// docs:end compile
