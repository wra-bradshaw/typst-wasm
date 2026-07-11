import type { TypstCompiler } from "typst-wasm";
import {
  assert,
  assertIncludes,
  assertSvgPage,
  textBytes,
  type IntegrationScenarioOptions,
} from "./harness.ts";

export type FileLifecycleResult = {
  svgOutputLength: number;
  filesBeforeClear: string[];
  filesAfterClear: string[];
};

const fileMainSource = `#set page(width: auto, height: auto, margin: 10pt)
#import "partial.typ": message
#let data = read("data.txt")
= Runtime Integration
#message
#data`;

const fileEditedSource = `#set page(width: auto, height: auto, margin: 10pt)
= Runtime Integration Updated
The compiler still works after remove_file().`;

export const runFileLifecycleScenario = async (
  compiler: TypstCompiler,
  options: IntegrationScenarioOptions,
): Promise<FileLifecycleResult> => {
  await compiler.clearFiles();
  await compiler.addSource("main.typ", fileMainSource);
  await compiler.addSource("partial.typ", "#let message = [Imported text]");
  await compiler.addFile("data.txt", textBytes("Binary file text"));
  await compiler.setMain("main.typ");

  assert(
    await compiler.hasFile("main.typ"),
    `[${options.runtime}] expected main.typ to exist after addSource`,
  );
  assert(
    await compiler.hasFile("data.txt"),
    `[${options.runtime}] expected data.txt to exist after addFile`,
  );
  assert(
    !(await compiler.hasFile("missing.typ")),
    `[${options.runtime}] expected missing.typ to be absent`,
  );

  const filesBeforeClear = await compiler.listFiles();
  assertIncludes(filesBeforeClear, "main.typ", options.runtime);
  assertIncludes(filesBeforeClear, "partial.typ", options.runtime);
  assertIncludes(filesBeforeClear, "data.txt", options.runtime);

  const firstResult = await compiler.compile({ format: "svg" });
  const svgOutputLength = assertSvgPage(
    firstResult,
    options.runtime,
    "file lifecycle compile",
  );
  const firstHtml = await compiler.compile({ format: "html" });
  assert(
    firstHtml.format === "html" &&
      firstHtml.output.includes("Imported text") &&
      firstHtml.output.includes("Binary file text"),
    `[${options.runtime}] expected imported and binary file contents in HTML`,
  );

  await compiler.removeFile("partial.typ");
  assert(
    !(await compiler.hasFile("partial.typ")),
    `[${options.runtime}] expected partial.typ to be removed`,
  );

  await compiler.addSource("main.typ", fileEditedSource);
  const editedResult = await compiler.compile({ format: "svg" });
  assertSvgPage(editedResult, options.runtime, "edited compile");

  await compiler.clearFiles();
  const filesAfterClear = await compiler.listFiles();
  assert(
    filesAfterClear.length === 0,
    `[${options.runtime}] expected no files after clearFiles`,
  );

  await compiler.addSource("main.typ", "= Final pass");
  const finalResult = await compiler.compile({
    main: "main.typ",
    format: "svg",
  });
  assertSvgPage(finalResult, options.runtime, "post-clear compile");

  return {
    svgOutputLength,
    filesBeforeClear,
    filesAfterClear,
  };
};
