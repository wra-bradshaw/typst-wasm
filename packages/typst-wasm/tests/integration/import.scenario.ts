import type { TypstCompiler } from "typst-wasm";
import {
  assert,
  assertSvgPage,
  type IntegrationScenarioOptions,
} from "./harness.ts";

const importSource = `#import "@preview/wordometer:0.1.5": word-count-of
#set page(width: auto, height: auto, margin: 10pt)
= Word Count Demo
#word-count-of(total: true)[Hello world, this is a test.]
`;

export const runImportScenario = async (
  compiler: TypstCompiler,
  options: IntegrationScenarioOptions,
): Promise<void> => {
  await compiler.clearFiles();
  await compiler.addSource("main.typ", importSource);

  const result = await compiler.compile({
    main: "main.typ",
    format: "svg",
  });

  assertSvgPage(result, options.runtime, "package import compile");
};
