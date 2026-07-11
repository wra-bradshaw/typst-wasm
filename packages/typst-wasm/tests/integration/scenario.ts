import {
  assertRejects,
  makeCompiler,
  type IntegrationScenarioOptions,
} from "./harness.ts";
import {
  runFileLifecycleScenario,
  type FileLifecycleResult,
} from "./file-lifecycle.scenario.ts";
import {
  runCompileFormatScenario,
  type CompileFormatResult,
} from "./formats.scenario.ts";
import { runOptionsAndErrorsScenario } from "./errors.scenario.ts";
import {
  runImportScenario,
  runDeterministicPackageScenario,
} from "./import.scenario.ts";
import { runConcurrencyScenario } from "./concurrency.scenario.ts";

export type IntegrationScenarioResult = {
  runtime: IntegrationScenarioOptions["runtime"];
} & FileLifecycleResult &
  CompileFormatResult;

export const assertIntegrationScenarioResult = (
  result: IntegrationScenarioResult,
): void => {
  const checks: Array<[boolean, string]> = [
    [result.svgOutputLength > 0, "SVG length to be > 0"],
    [result.pdfFormatSeen, "PDF format to be seen"],
    [result.pngOutputLength > 0, "PNG length to be > 0"],
    [result.htmlOutputLength > 0, "HTML output length to be > 0"],
    [result.bundleFileCount > 0, "bundle file count to be > 0"],
    [result.filesBeforeClear.includes("main.typ"), "main.typ before clear"],
    [
      result.filesBeforeClear.includes("partial.typ"),
      "partial.typ before clear",
    ],
    [result.filesBeforeClear.includes("data.txt"), "data.txt before clear"],
    [result.filesAfterClear.length === 0, "files after clear to be empty"],
  ];

  for (const [passed, message] of checks) {
    if (!passed) throw new Error(`[${result.runtime}] expected ${message}`);
  }
};

export const runCompilerIntegrationScenario = async (
  options: IntegrationScenarioOptions,
): Promise<IntegrationScenarioResult> => {
  const compiler = await makeCompiler(options);
  let result: IntegrationScenarioResult;

  try {
    const fileLifecycle = await runFileLifecycleScenario(compiler, options);
    const formats = await runCompileFormatScenario(compiler, options);
    await runOptionsAndErrorsScenario(compiler, options);
    await runImportScenario(compiler, options);
    await runDeterministicPackageScenario(compiler, options);

    result = {
      runtime: options.runtime,
      ...fileLifecycle,
      ...formats,
    };
  } finally {
    await compiler.dispose();
  }

  await runConcurrencyScenario(options);

  await assertRejects(
    compiler.compile({ format: "svg" }),
    (error) => error instanceof Error,
    `[${options.runtime}] expected compile after dispose to reject`,
  );

  return result;
};
