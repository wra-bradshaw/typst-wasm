import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

import type { BrowserInstanceOption } from "vitest/node";

const browserInstances: BrowserInstanceOption[] = [
  {
    browser: "chromium",
    include: ["tests/integration/adapters/browser.test.ts"],
    provide: { browserRuntime: "chromium" },
    provider: playwright({
      launchOptions: { args: ["--enable-features=WebAssemblyJSPI"] },
    }),
  },
  {
    browser: "firefox",
    include: ["tests/integration/adapters/browser.test.ts"],
    provide: { browserRuntime: "firefox" },
    provider: playwright({
      launchOptions: {
        firefoxUserPrefs: {
          "javascript.options.wasm_js_promise_integration": true,
        },
      },
    }),
  },
  {
    browser: "webkit",
    include: ["tests/integration/adapters/browser.test.ts"],
    provide: { browserRuntime: "webkit" },
    provider: playwright(),
  },
];

export default defineConfig({
  server: {
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  },
  optimizeDeps: {
    entries: ["tests/integration/adapters/browser.test.ts"],
    include: ["@std/expect", "nanotar"],
  },
  test: {
    globals: true,
    testTimeout: 120_000,
    maxWorkers: 1,
    browser: {
      enabled: true,
      connectTimeout: 120_000,
      instances: browserInstances,
    },
  },
});
