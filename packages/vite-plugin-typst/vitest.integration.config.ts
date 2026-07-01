import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    execArgv: ["--experimental-wasm-jspi"],
    include: ["tests/**/*.{test,spec}.?(c|m)[jt]s?(x)"],
    exclude: [".direnv/**", "dist/**", "node_modules/**"],
    testTimeout: 60000,
  },
});
