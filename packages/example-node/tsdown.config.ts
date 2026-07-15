import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["./src/index.ts"],
  platform: "node",
  format: ["esm"],
  external: ["typst-wasm", /^@typst-wasm\//],
  clean: true,
  sourcemap: true,
});
