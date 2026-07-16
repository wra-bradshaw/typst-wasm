import {
  serializeError,
  type CanonicalCase,
  type CaseResult,
  type IntegrationContext,
} from "./types.ts";
import { backendCases } from "./cases/backend-selection.ts";
import { concurrencyCases } from "./cases/concurrency.ts";
import { errorCases } from "./cases/errors.ts";
import { formatCases } from "./cases/formats.ts";
import { lifecycleCases } from "./cases/lifecycle.ts";
import { importCases } from "./cases/imports.ts";

/** The only case list imported by runtime adapters. Keep this order stable. */
export const canonicalCases: readonly CanonicalCase[] = [
  ...lifecycleCases,
  ...formatCases,
  ...errorCases,
  ...importCases,
  ...concurrencyCases,
  ...backendCases,
];

const assertCaseSet = (
  cases: readonly CanonicalCase[],
  expectedCases: readonly CanonicalCase[],
): void => {
  const expected = new Set(expectedCases.map((testCase) => testCase.id));
  const actual = new Set(cases.map((testCase) => testCase.id));
  if (expected.size !== expectedCases.length || actual.size !== cases.length) {
    throw new Error("Integration case IDs must be unique");
  }
  if (
    expected.size !== actual.size ||
    [...expected].some((id) => !actual.has(id))
  ) {
    throw new Error(
      "Integration adapters must execute the complete canonical suite",
    );
  }
};

/** Execute a validated case list. */
const executeSuite = async (
  context: IntegrationContext,
  cases: readonly CanonicalCase[],
  expectedCases: readonly CanonicalCase[] = cases,
): Promise<CaseResult[]> => {
  assertCaseSet(cases, expectedCases);
  const expected = new Set(expectedCases.map((testCase) => testCase.id));
  const results: CaseResult[] = [];
  let sharedCompiler:
    | Awaited<ReturnType<IntegrationContext["createCompiler"]>>
    | undefined;
  let sharedContext: IntegrationContext | undefined;
  let sharedGroup: string | undefined;

  const disposeShared = async (): Promise<Error | undefined> => {
    const compiler = sharedCompiler;
    sharedCompiler = undefined;
    sharedContext = undefined;
    sharedGroup = undefined;
    if (!compiler) return undefined;
    try {
      await compiler.dispose();
    } catch (error) {
      return error instanceof Error ? error : new Error(String(error));
    }
    return undefined;
  };

  let finalDisposeError: Error | undefined;
  try {
    for (const testCase of cases) {
      const started = performance.now();
      try {
        if (
          testCase.isolation !== "shared" ||
          sharedGroup !== testCase.sharedGroup
        ) {
          const disposeError = await disposeShared();
          if (disposeError) throw disposeError;
        }
        if (testCase.isolation === "shared" && !sharedCompiler) {
          if (!testCase.sharedGroup) {
            throw new Error(
              `Shared case ${testCase.id} must declare sharedGroup`,
            );
          }
          sharedCompiler = await context.createCompiler();
          sharedGroup = testCase.sharedGroup;
          sharedContext = {
            ...context,
            withCompiler: async (run) => run(sharedCompiler!),
          };
        }
        await testCase.run(sharedContext ?? context);
        results.push({
          runtime: context.runtime,
          backend: context.backend,
          caseId: testCase.id,
          durationMs: performance.now() - started,
          passed: true,
        });
      } catch (error) {
        results.push({
          runtime: context.runtime,
          backend: context.backend,
          caseId: testCase.id,
          durationMs: performance.now() - started,
          passed: false,
          error: serializeError(error),
        });
        // A failed shared case may have left compiler state partially mutated.
        // Never expose that state to the next case in the group.
        if (testCase.isolation === "shared") {
          const disposeError = await disposeShared();
          if (disposeError) {
            results[results.length - 1]!.error = serializeError(disposeError);
          }
        }
      }
    }
  } finally {
    const disposeError = await disposeShared();
    if (disposeError && results.length > 0) {
      const result = results[results.length - 1]!;
      result.passed = false;
      result.error = serializeError(disposeError);
    } else {
      finalDisposeError = disposeError;
    }
  }
  if (finalDisposeError) throw finalDisposeError;

  const resultIds = new Set(results.map((result) => result.caseId));
  if (
    results.length !== expectedCases.length ||
    resultIds.size !== expectedCases.length ||
    [...expected].some((id) => !resultIds.has(id))
  ) {
    throw new Error("Integration suite returned an incomplete result set");
  }
  return results;
};

/** Execute the complete canonical suite in every host. */
export const runSuite = (
  context: IntegrationContext,
  cases: readonly CanonicalCase[] = canonicalCases,
): Promise<CaseResult[]> => executeSuite(context, cases, canonicalCases);

export const assertSuitePassed = (results: readonly CaseResult[]): void => {
  const failures = results.filter((result) => !result.passed);
  if (failures.length === 0) return;

  throw new Error(
    failures
      .map(
        ({ caseId, error }) =>
          `${caseId}: ${error?.name ?? "Error"}: ${error?.message ?? "failed"}`,
      )
      .join("\n"),
  );
};
