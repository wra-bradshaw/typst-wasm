import { wasmBinaryUrl } from "@typst-wasm/engine-wasm";
import { describe, expect, test } from "bun:test";
import { runCompilerE2eScenario } from "./scenario";

describe("bun e2e (worker backend)", () => {
  test("compiles and supports iterative file operations", async () => {
    const moduleOrPath = wasmBinaryUrl.href;
    const result = await runCompilerE2eScenario({
      runtime: "bun",
      moduleOrPath,
      backend: "worker",
    });

    expect(result.firstOutputLength).toBeGreaterThan(0);
    expect(result.secondOutputLength).toBeGreaterThan(0);
    expect(result.filesBeforeClear).toContain("main.typ");
    expect(result.filesAfterClear).toEqual([]);
  });
});
