/// <reference types="bun" />
import { test } from "bun:test";
import { makeNodeContext } from "../contexts/node.ts";
import { canonicalCases, assertSuitePassed, runSuite } from "../spec/suite.ts";

// Bun uses the same built-package worker boundary and portable suite. The
// factory is shared because Bun implements the Node-compatible worker APIs.
test("bun:worker canonical integration suite", async () => {
  const context = await makeNodeContext("worker", "bun");
  assertSuitePassed(await runSuite(context, canonicalCases));
}, 120_000);
