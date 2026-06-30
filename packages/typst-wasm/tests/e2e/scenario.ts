import {
  assertRejects,
  makeCompiler,
  type E2eScenarioOptions,
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

type E2eScenarioResult = {
  runtime: E2eScenarioOptions["runtime"];
} & FileLifecycleResult &
  CompileFormatResult;

export const runCompilerE2eScenario = async (
  options: E2eScenarioOptions,
): Promise<E2eScenarioResult> => {
  const compiler = await makeCompiler(options);
  let result: E2eScenarioResult;

  try {
    const fileLifecycle = await runFileLifecycleScenario(compiler, options);
    const formats = await runCompileFormatScenario(compiler, options);
    await runOptionsAndErrorsScenario(compiler, options);

    result = {
      runtime: options.runtime,
      ...fileLifecycle,
      ...formats,
    };
  } finally {
    await compiler.dispose();
  }

  await assertRejects(
    compiler.compile({ format: "svg" }),
    (error) => error instanceof Error,
    `[${options.runtime}] expected compile after dispose to reject`,
  );

  return result;
};
