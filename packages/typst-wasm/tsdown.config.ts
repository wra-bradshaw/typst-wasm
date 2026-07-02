import { defineConfig } from "tsdown";
import workerPlugins from "tsdown-plugin-worker";

const external = [
  "@typst-wasm/engine-wasm",
  "@typst-wasm/engine-wasm/bridge",
  "@typst-wasm/engine-wasm/typst_wasm_bg.js",
  "@typst-wasm/engine-wasm/typst_wasm_bg.wasm",
  "@typst-wasm/engine-wasm/typst_wasm_bg.wasm?init",
  "node:fs/promises",
];

export default defineConfig({
  entry: {
    index: "./src/index.ts",
    "index.browser": "./src/index.browser.ts",
    files: "./src/files.ts",
    wasm: "./src/wasm.ts",
  },
  platform: "neutral",
  external,
  plugins: [
    workerPlugins({
      format: "es",
      rolldownOptions: {
        external,
      },
    }),
  ],
  format: ["esm"],
  clean: true,
  dts: true,
  sourcemap: true,
  loader: {
    ".otf": "asset",
  },
  inputOptions: {
    experimental: {
      resolveNewUrlToAsset: true,
    },
    resolve: {
      mainFields: ["module", "main"],
    },
  },
  outputOptions: {
    assetFileNames: "fonts/[name][extname]",
  },
});
