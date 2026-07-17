import { defineConfig } from "tsdown";
import workerPlugins from "tsdown-plugin-worker";

const external = ["node:fs/promises", "node:worker_threads"];

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
      "worker/node": "./src/worker/host-node.ts",
      "worker/browser": "./src/worker/host-browser.ts",
    },
    clean: true,
    plugins: [
      workerPlugins({
        format: "es",
        rolldownOptions: {
          external,
        },
      }),
    ],
  },
  {
    ...common,
    external: ["node:worker_threads", "node:fs/promises"],
    entry: {
      "worker/worker-thread": "./src/worker/worker-thread.ts",
    },
    clean: false,
  },
  {
    ...common,
    external: ["node:fs/promises"],
    entry: {
      "worker/web-worker": "./src/worker/web-worker.ts",
    },
    clean: false,
  },
]);
