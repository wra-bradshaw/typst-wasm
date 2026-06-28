import { createTypstCompiler, defaultFonts } from "../../dist/index.js";

type RuntimeName = "bun" | "node" | "deno";

type E2eScenarioOptions = {
  runtime: RuntimeName;
  moduleOrPath:
    | RequestInfo
    | URL
    | Response
    | BufferSource
    | WebAssembly.Module;
  fontData?: Uint8Array[];
  backend?: "auto" | "worker" | "jspi";
};

type E2eScenarioResult = {
  runtime: RuntimeName;
  firstOutputLength: number;
  secondOutputLength: number;
  filesBeforeClear: string[];
  filesAfterClear: string[];
};

const assert: (condition: unknown, message: string) => asserts condition = (
  condition,
  message,
) => {
  if (!condition) {
    throw new Error(message);
  }
};

const mainPath = "main.typ";

const initialSource = `#set page(width: auto, height: auto, margin: 10pt)
= Runtime E2E
Hello from typst-wasm.`;

const editedSource = `#set page(width: auto, height: auto, margin: 10pt)
= Runtime E2E Updated
Hello from typst-wasm after edit.`;

const finalSource = `#set page(width: auto, height: auto, margin: 10pt)
= Final pass
The compiler still works after clear_files().`;

export const runCompilerE2eScenario = async (
  options: E2eScenarioOptions,
): Promise<E2eScenarioResult> => {
  const compiler = await createTypstCompiler({
    moduleOrPath: options.moduleOrPath,
    backend: options.backend,
  });

  try {
    const fontData = options.fontData
      ? options.fontData
      : await Promise.all(defaultFonts.map((font) => font.load()));

    for (const data of fontData) {
      await compiler.addFont(data);
    }

    await compiler.addSource(mainPath, initialSource);
    const hasMainBeforeCompile = await compiler.hasFile(mainPath);
    assert(
      hasMainBeforeCompile,
      `[${options.runtime}] expected ${mainPath} to exist after addSource`,
    );

    const listedFilesBefore = await compiler.listFiles();
    assert(
      listedFilesBefore.includes(mainPath),
      `[${options.runtime}] expected listFiles to include ${mainPath}`,
    );

    const firstResult = await compiler.compile({
      main: mainPath,
      format: "svg",
    });
    assert(
      firstResult !== undefined &&
        firstResult.format === "svg" &&
        firstResult.pages.length > 0,
      `[${options.runtime}] expected first compile to return SVG pages`,
    );

    await compiler.addSource(mainPath, editedSource);
    const secondResult = await compiler.compile({ format: "svg" });
    assert(
      secondResult !== undefined &&
        secondResult.format === "svg" &&
        secondResult.pages.length > 0,
      `[${options.runtime}] expected second compile to return SVG pages`,
    );

    await compiler.clearFiles();
    const listedFilesAfterClear = await compiler.listFiles();
    assert(
      listedFilesAfterClear.length === 0,
      `[${options.runtime}] expected no files after clearFiles`,
    );

    await compiler.addSource(mainPath, finalSource);
    const finalResult = await compiler.compile({
      main: mainPath,
      format: "svg",
    });
    assert(
      finalResult !== undefined &&
        finalResult.format === "svg" &&
        finalResult.pages.length > 0,
      `[${options.runtime}] expected final compile to return SVG pages`,
    );

    return {
      runtime: options.runtime,
      firstOutputLength: firstResult.pages[0]?.output.length ?? 0,
      secondOutputLength: secondResult.pages[0]?.output.length ?? 0,
      filesBeforeClear: listedFilesBefore,
      filesAfterClear: listedFilesAfterClear,
    };
  } finally {
    await compiler.dispose();
  }
};
