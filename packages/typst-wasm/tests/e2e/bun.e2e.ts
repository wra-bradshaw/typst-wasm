import { describe, expect, test } from "bun:test";
import { WorkerBackendLayer } from "../../dist/index.js";
import { runCompilerE2eScenario } from "./scenario";

describe("bun e2e (worker backend)", () => {
  test("compiles and supports iterative file operations", async () => {
    const moduleOrPath = new URL("../../dist/typst_wasm_bg.wasm", import.meta.url).href;
    const result = await runCompilerE2eScenario({
      runtime: "bun",
      moduleOrPath,
      backendLayer: WorkerBackendLayer,
    });

    expect(result.firstSvgLength).toBeGreaterThan(0);
    expect(result.secondSvgLength).toBeGreaterThan(0);
    expect(result.filesBeforeClear).toContain("main.typ");
    expect(result.filesAfterClear).toEqual([]);
  });
});
