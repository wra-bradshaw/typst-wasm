/// <reference types="@cloudflare/vitest-pool-workers/types" />
/// <reference types="@cloudflare/workers-types" />

import { exports } from "cloudflare:workers";
import { assertSuitePassed } from "../../spec/suite.ts";
import { test } from "vitest";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cloudflare {
    interface GlobalProps {
      // eslint-disable-next-line @typescript-eslint/consistent-type-imports
      mainModule: typeof import("./guest.ts");
    }
  }
}

test("workerd:jspi canonical integration suite", async () => {
  const response = await exports.default.fetch("https://integration.test/");
  const payload = (await response.json()) as {
    cell?: string;
    results?: unknown[];
    error?: { message: string };
  };
  if (!response.ok)
    throw new Error(
      payload.error?.message ?? `workerd request failed (${response.status})`,
    );
  if (payload.cell !== "workerd:jspi" || !payload.results)
    throw new Error("workerd returned an invalid integration result");
  assertSuitePassed(payload.results as never);
}, 120_000);
