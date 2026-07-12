import type { IntegrationRuntime } from "./integration/spec/types.ts";

import "vitest";

declare module "vitest" {
  interface ProvidedContext {
    browserRuntime: Extract<
      IntegrationRuntime,
      "chromium" | "firefox" | "webkit"
    >;
  }
}
