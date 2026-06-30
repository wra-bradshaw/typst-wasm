import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["./src/index.ts"],
  platform: "node",
  external: ["typst-wasm", "typst-wasm/wasm"],
  format: ["esm"],
  clean: true,
  dts: true,
  sourcemap: true,
});
