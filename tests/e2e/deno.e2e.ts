import { WorkerBackendLayer } from "../../dist/index.js";
import { runCompilerE2eScenario } from "./scenario.ts";

Deno.test("deno e2e (worker backend) compiles and supports iterative file operations", async () => {
  const moduleOrPath = new URL("../../dist/typst_wasm_bg.wasm", import.meta.url).href;
  const result = await runCompilerE2eScenario({
    runtime: "deno",
    moduleOrPath,
    backendLayer: WorkerBackendLayer,
  });

  if (!(result.firstSvgLength > 0)) {
    throw new Error("Expected first compile SVG length to be > 0");
  }
  if (!(result.secondSvgLength > 0)) {
    throw new Error("Expected second compile SVG length to be > 0");
  }
  if (!result.filesBeforeClear.includes("main.typ")) {
    throw new Error("Expected filesBeforeClear to include main.typ");
  }
  if (!(result.filesAfterClear.length === 0)) {
    throw new Error("Expected filesAfterClear to be empty");
  }
});
