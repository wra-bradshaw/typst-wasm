import { defineConfig } from "tsdown";
import workerPlugins from "tsdown-plugin-worker";

export default defineConfig({
  entry: ["./src/index.ts", "./src/wasm.ts"],
  platform: "neutral",
  external: ["@typst-wasm/engine-wasm"],
  plugins: [
    workerPlugins({
      format: "es",
      rolldownOptions: {
        external: ["@typst-wasm/engine-wasm"],
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
