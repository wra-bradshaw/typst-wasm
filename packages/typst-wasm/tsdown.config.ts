import { defineConfig } from "tsdown";
import workerPlugins from "tsdown-plugin-worker";

const external = [
  "@typst-wasm/engine-wasm",
  "@typst-wasm/engine-wasm/bridge",
  "@typst-wasm/engine-wasm/typst_wasm_bg.js",
  "node:fs/promises",
  "node:worker_threads",
];

const common = {
  platform: "neutral" as const,
  external,
  format: ["esm" as const],
  dts: true,
  sourcemap: true,
  loader: {
    ".otf": "asset" as const,
  },
  inputOptions: {
    resolve: {
      mainFields: ["module", "main"],
    },
  },
  outputOptions: {
    assetFileNames: "fonts/[name][extname]",
  },
};

export default defineConfig([
  {
    ...common,
    entry: {
      index: "./src/index.ts",
      "index.browser": "./src/index.browser.ts",
      "index.workerd": "./src/index.workerd.ts",
      files: "./src/files.ts",
    },
    plugins: [
      workerPlugins({
        format: "es",
        rolldownOptions: {
          external,
        },
      }),
    ],
    clean: true,
  },
  {
    ...common,
    external: ["node:worker_threads"],
    noExternal: [/^@typst-wasm\/engine-wasm/],
    entry: {
      "worker/node": "./src/worker/node.ts",
    },
    clean: false,
  },
  {
    ...common,
    external: [],
    noExternal: [/^@typst-wasm\/engine-wasm/],
    entry: {
      "worker/browser": "./src/worker/browser.ts",
    },
    clean: false,
  },
]);
