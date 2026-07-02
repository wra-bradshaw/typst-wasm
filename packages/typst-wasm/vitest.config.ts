import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: [
      "src/**/*.{test,spec}.?(c|m)[jt]s?(x)",
      "tests/unit/**/*.{test,spec}.?(c|m)[jt]s?(x)",
    ],
    exclude: [".direnv/**", "dist/**", "node_modules/**"],
    testTimeout: 60000,
  },
});
