import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/integration/node.integration.ts"],
    testTimeout: 60000,
    server: {
      deps: {
        external: ["@typst-wasm/engine-wasm", /engine-wasm/],
      },
    },
  },
});
