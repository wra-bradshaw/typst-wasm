import { defineConfig } from "tsdown";
import workerPlugins from "tsdown-plugin-worker";

export default defineConfig({
  entry: ["./src/index.ts"],
  platform: "neutral",
  plugins: [
    workerPlugins({
      format: "es",
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
