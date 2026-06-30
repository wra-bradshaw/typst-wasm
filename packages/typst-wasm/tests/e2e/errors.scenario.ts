import { CompileError, type TypstCompiler } from "typst-wasm";
import {
  assertRejects,
  assertSvgPage,
  type E2eScenarioOptions,
} from "./harness.ts";

const inputsSource = `#set page(width: auto, height: auto, margin: 10pt)
Input value: #sys.inputs.at("mode", default: "missing")`;

export const runOptionsAndErrorsScenario = async (
  compiler: TypstCompiler,
  options: E2eScenarioOptions,
): Promise<void> => {
  await compiler.clearFiles();
  await compiler.addSource("main.typ", inputsSource);
  const inputResult = await compiler.compile({
    main: "main.typ",
    format: "svg",
    inputs: { mode: "e2e" },
  });
  assertSvgPage(inputResult, options.runtime, "inputs compile");

  await compiler.addSource("bad.typ", "#let x =");
  await assertRejects(
    compiler.compile({ main: "bad.typ", format: "svg" }),
    (error) =>
      error instanceof CompileError &&
      error.diagnostics !== undefined &&
      error.diagnostics.length > 0,
    `[${options.runtime}] expected bad source to reject with CompileError diagnostics`,
  );
};
