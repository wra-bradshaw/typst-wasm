import {
  createTypstCompiler,
  defaultFonts,
  type CompileResult,
  type TypstCompiler,
} from "typst-wasm";

export type RuntimeName = "bun" | "node" | "deno";

export type E2eScenarioOptions = {
  runtime: RuntimeName;
  wasmURL: string | URL;
  glueURL: string | URL;
  fontData?: Uint8Array[];
  backend?: "auto" | "worker" | "jspi";
};

export const assert: (
  condition: unknown,
  message: string,
) => asserts condition = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

export const assertRejects = async (
  promise: Promise<unknown>,
  predicate: (error: unknown) => boolean,
  message: string,
): Promise<void> => {
  try {
    await promise;
  } catch (error) {
    assert(predicate(error), message);
    return;
  }

  throw new Error(message);
};

export const textBytes = (text: string): Uint8Array =>
  new TextEncoder().encode(text);

export const assertIncludes = (
  values: string[],
  expected: string,
  runtime: RuntimeName,
): void => {
  assert(
    values.includes(expected),
    `[${runtime}] expected listFiles to include ${expected}; got ${values.join(", ")}`,
  );
};

export const assertSvgPage = (
  result: CompileResult,
  runtime: RuntimeName,
  label: string,
): number => {
  assert(
    result.format === "svg" && result.pages.length > 0,
    `[${runtime}] expected ${label} to return SVG pages`,
  );
  const output = result.pages[0]?.output ?? "";
  assert(output.length > 0, `[${runtime}] expected ${label} SVG output`);
  return output.length;
};

const addDefaultFonts = async (
  compiler: TypstCompiler,
  fontData?: Uint8Array[],
): Promise<void> => {
  const fonts = fontData
    ? fontData
    : await Promise.all(defaultFonts.map((font) => font.load()));

  for (const data of fonts) {
    await compiler.addFont(data);
  }
};

export const makeCompiler = async (
  options: E2eScenarioOptions,
): Promise<TypstCompiler> => {
  const compiler = await createTypstCompiler({
    wasmURL: options.wasmURL,
    glueURL: options.glueURL,
    backend: options.backend,
  });

  await addDefaultFonts(compiler, options.fontData);
  return compiler;
};
