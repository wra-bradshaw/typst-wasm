import { defineConfig } from "tsdown";
import workerPlugins from "tsdown-plugin-worker";

const external = [
  "@typst-wasm/engine-wasm",
  "@typst-wasm/engine-wasm/jspi",
  "@typst-wasm/engine-wasm/worker",
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
      "public-api": "./src/public-api.ts",
      index: "./src/index.ts",
      "index.browser": "./src/index.browser.ts",
      "index.workerd": "./src/index.workerd.ts",
    },
    plugins: [
      workerPlugins({
        format: "es",
        rolldownOptions: {
          external,
        },
      }),
    ],
    clean: false,
  },
  {
    ...common,
    external: ["node:worker_threads", "node:fs/promises"],
    noExternal: ["@typst-wasm/engine-wasm/worker"],
    entry: {
      "worker/worker-thread": "./src/worker/node.ts",
    },
    clean: false,
  },
  {
    ...common,
    external: ["@typst-wasm/engine-wasm/worker"],
    entry: {
      "worker/web-worker": "./src/worker/browser.ts",
    },
    clean: false,
  },
]);
