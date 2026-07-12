import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: "./wrangler.workerd.jsonc" },
      miniflare: { compatibilityDate: "2026-07-08" },
    }),
  ],
  test: {
    include: ["tests/integration/adapters/workerd/host.test.ts"],
  },
});
