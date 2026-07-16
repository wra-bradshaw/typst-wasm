import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "tsdown";
import workerPlugins from "tsdown-plugin-worker";

const packageRoot = dirname(fileURLToPath(import.meta.url));
const generatedJspi = resolve(
  packageRoot,
  "src/engine/generated/jspi/engine.js",
);
const generatedWorker = resolve(
  packageRoot,
  "src/engine/generated/worker/engine.js",
);

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
      "public-api": "./src/public-api.ts",
      index: "./src/index.ts",
      "index.browser": "./src/index.browser.ts",
      "index.workerd": "./src/index.workerd.ts",
    },
    noExternal: ["typst-wasm/engine"],
    inputOptions: {
      resolve: {
        alias: {
          "typst-wasm/engine": generatedJspi,
        },
        mainFields: ["module", "main"],
      },
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
    noExternal: ["typst-wasm/engine/worker"],
    inputOptions: {
      resolve: {
        alias: {
          "typst-wasm/engine/worker": generatedWorker,
        },
        mainFields: ["module", "main"],
      },
    },
    entry: {
      "worker/worker-thread": "./src/worker/node.ts",
    },
    clean: false,
  },
  {
    ...common,
    external: ["node:fs/promises"],
    noExternal: ["typst-wasm/engine/worker"],
    inputOptions: {
      resolve: {
        alias: {
          "typst-wasm/engine/worker": generatedWorker,
        },
        mainFields: ["module", "main"],
      },
    },
    entry: {
      "worker/web-worker": "./src/worker/browser.ts",
    },
    clean: false,
  },
]);
