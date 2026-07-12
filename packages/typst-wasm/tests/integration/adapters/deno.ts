/// <reference types="deno" />

import { canonicalCases, assertSuitePassed, runSuite } from "../spec/suite.ts";
import { makeDenoContext } from "../contexts/deno.ts";

Deno.test({
  name: "deno:worker canonical integration suite",
  timeout: 120_000,
  async fn() {
    assertSuitePassed(
      await runSuite(await makeDenoContext("worker"), canonicalCases),
    );
  },
});
