import {
  createTypstCompiler,
  type CompileResult,
  type TypstCompiler,
  type TypstWasmAsset,
} from "typst-wasm";

export type RuntimeName = "bun" | "node" | "deno";

export type IntegrationScenarioOptions = {
  runtime: RuntimeName;
  wasm: TypstWasmAsset;
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

export const fontFilenames = [
  "NewCMMath-Regular.otf",
  "NewCMMath-Bold.otf",
  "NewCMMath-Book.otf",
];

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
  if (fontData) {
    for (const data of fontData) {
      await compiler.addFont(data);
    }
    return;
  }

  for (const filename of fontFilenames) {
    const response = await fetch(
      new URL(`../../../fonts/dist/files/${filename}`, import.meta.url),
    );
    await compiler.addFont(new Uint8Array(await response.arrayBuffer()));
  }
};

export const makeCompiler = async (
  options: IntegrationScenarioOptions,
): Promise<TypstCompiler> => {
  const compiler = await createTypstCompiler({
    assets: {
      wasm: options.wasm,
    },
    backend: options.backend,
  });

  await addDefaultFonts(compiler, options.fontData);
  return compiler;
};
