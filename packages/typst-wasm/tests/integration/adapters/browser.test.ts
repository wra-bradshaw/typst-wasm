/// <reference types="vite/client" />

import { expect, test } from "vitest";
import { canonicalCases, assertSuitePassed, runSuite } from "../spec/suite.ts";
import { makeBrowserContext } from "../contexts/browser.ts";
import type { IntegrationBackend, IntegrationRuntime } from "../spec/types.ts";
import workerUrl from "typst-wasm/worker/browser?url";
import coreUrl from "@typst-wasm/engine-wasm/worker/engine.core.wasm?url";
import core2Url from "@typst-wasm/engine-wasm/worker/engine.core2.wasm?url";
import core3Url from "@typst-wasm/engine-wasm/worker/engine.core3.wasm?url";
import regularUrl from "@typst-wasm/fonts/NewCMMath-Regular.otf?url";
import boldUrl from "@typst-wasm/fonts/NewCMMath-Bold.otf?url";
import bookUrl from "@typst-wasm/fonts/NewCMMath-Book.otf?url";

type BrowserRuntime = Extract<
  IntegrationRuntime,
  "chromium" | "firefox" | "webkit"
>;

export const registerBrowserTests = (
  runtime: BrowserRuntime,
  backends: readonly IntegrationBackend[],
): void => {
  for (const backend of backends) {
    test(`canonical integration ${runtime}:${backend}`, async () => {
      expect(crossOriginIsolated).toBe(true);
      const results = await runSuite(
        await makeBrowserContext(runtime, backend, {
          worker: workerUrl,
          cores: {
            "engine.core.wasm": coreUrl,
            "engine.core2.wasm": core2Url,
            "engine.core3.wasm": core3Url,
          },
          fonts: [regularUrl, boldUrl, bookUrl],
        }),
        canonicalCases,
      );
      assertSuitePassed(results);
    });
  }
};
