import { expect } from "@std/expect";
import type { CompileResult, TypstCompiler } from "typst-wasm";
import type { IntegrationContext } from "../types.ts";

export const withCompiler = <T>(
  context: IntegrationContext,
  run: (compiler: TypstCompiler) => Promise<T>,
): Promise<T> => context.withCompiler(run);

export const expectSvg = (result: CompileResult): void => {
  if (result.format !== "svg") throw new Error("expected SVG result");
  expect(result.pages.length).toBeGreaterThan(0);
  const output = result.pages[0]?.output ?? "";
  expect(output).toContain("<svg");
};

export const expectRejected = async (
  operation: Promise<unknown>,
  predicate: (error: unknown) => boolean = () => true,
): Promise<void> => {
  let rejected = false;
  try {
    await operation;
  } catch (error) {
    rejected = true;
    expect(predicate(error)).toBe(true);
  }
  expect(rejected).toBe(true);
};
