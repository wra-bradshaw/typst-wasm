import { test } from "node:test";
import { canonicalCases, assertSuitePassed, runSuite } from "../spec/suite.ts";
import { makeNodeContext } from "../contexts/node.ts";

for (const backend of ["worker", "jspi"] as const) {
  test(`node:${backend} canonical integration suite`, async () => {
    const context = await makeNodeContext(backend);
    assertSuitePassed(await runSuite(context, canonicalCases));
  });
}
