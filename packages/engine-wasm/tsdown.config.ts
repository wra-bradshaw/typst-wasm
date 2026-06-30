import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["./src/bridge.ts"],
  platform: "neutral",
  format: ["esm"],
  clean: false,
  dts: true,
  sourcemap: true,
});
