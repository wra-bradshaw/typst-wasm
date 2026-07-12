/// <reference types="deno" />

import { canonicalCases, assertSuitePassed, runSuite } from "../spec/suite.ts";
import { makeDenoContext } from "../contexts/deno.ts";

Deno.test("deno:worker canonical integration suite", async () => {
  assertSuitePassed(
    await runSuite(await makeDenoContext("worker"), canonicalCases),
  );
});
