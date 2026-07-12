import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

type Browser = "chromium" | "firefox" | "webkit";

export const browserConfig = (browser: Browser) =>
  defineConfig({
    server: {
      headers: {
        "Cross-Origin-Opener-Policy": "same-origin",
        "Cross-Origin-Embedder-Policy": "require-corp",
      },
    },
    test: {
      globals: true,
      include: [`tests/integration/adapters/browser.${browser}.test.ts`],
      testTimeout: 120000,
      maxWorkers: 1,
      browser: {
        enabled: true,
        provider: playwright(
          browser === "chromium"
            ? { launchOptions: { args: ["--enable-features=WebAssemblyJSPI"] } }
            : browser === "firefox"
              ? {
                  launchOptions: {
                    firefoxUserPrefs: {
                      "javascript.options.wasm_js_promise_integration": true,
                    },
                  },
                }
              : {},
        ),
        instances: [{ browser }],
      },
    },
  });

export default browserConfig("chromium");
