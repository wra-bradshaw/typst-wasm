import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["./src/index.ts"],
  platform: "node",
  external: ["typst-wasm", "typst-wasm/wasm"],
  format: ["esm"],
  clean: true,
  dts: true,
  sourcemap: true,
  copy: [{ from: "src/client.d.ts", to: "dist" }],
  banner: {
    dts: '/// <reference path="./client.d.ts" />\n',
  },
});
