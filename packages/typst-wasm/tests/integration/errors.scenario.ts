import { CompileError, type TypstCompiler } from "typst-wasm";
import {
  assertRejects,
  assertSvgPage,
  type IntegrationScenarioOptions,
} from "./harness.ts";

const inputsSource = `#set page(width: auto, height: auto, margin: 10pt)
Input value: #sys.inputs.at("mode", default: "missing")`;

export const runOptionsAndErrorsScenario = async (
  compiler: TypstCompiler,
  options: IntegrationScenarioOptions,
): Promise<void> => {
  await compiler.clearFiles();
  await compiler.addSource("main.typ", inputsSource);
  const inputResult = await compiler.compile({
    main: "main.typ",
    format: "svg",
    inputs: { mode: "integration" },
  });
  assertSvgPage(inputResult, options.runtime, "inputs compile");
  const inputHtml = await compiler.compile({
    format: "html",
    inputs: { mode: "integration" },
  });
  if (
    inputHtml.format !== "html" ||
    !inputHtml.output.includes("integration")
  ) {
    throw new Error(`[${options.runtime}] expected input value in HTML output`);
  }

  await compiler.addSource("bad.typ", "#let x =");
  await assertRejects(
    compiler.compile({ main: "bad.typ", format: "svg" }),
    (error) =>
      error instanceof CompileError &&
      error.diagnostics !== undefined &&
      error.diagnostics.length > 0 &&
      error.diagnostics.some(
        (diagnostic) =>
          diagnostic.file === "bad.typ" &&
          diagnostic.message.length > 0 &&
          (diagnostic.line !== undefined ||
            diagnostic.formatted.includes("bad.typ")),
      ),
    `[${options.runtime}] expected bad source to reject with CompileError diagnostics`,
  );
};
