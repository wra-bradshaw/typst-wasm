import { Effect } from "effect";
import { defaultFonts, TypstCompilerService } from "../../dist/index.js";

type RuntimeName = "bun" | "node" | "deno";

type E2eScenarioOptions = {
  runtime: RuntimeName;
  moduleOrPath: RequestInfo | URL | Response | BufferSource | WebAssembly.Module;
  fontData?: Uint8Array[];
  backendLayer: unknown;
};

type E2eScenarioResult = {
  runtime: RuntimeName;
  firstSvgLength: number;
  secondSvgLength: number;
  filesBeforeClear: string[];
  filesAfterClear: string[];
};

const assert = (condition: boolean, message: string): void => {
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

export const runCompilerE2eScenario = async (options: E2eScenarioOptions): Promise<E2eScenarioResult> => {
  const program = Effect.gen(function* () {
    const compiler = yield* TypstCompilerService;
    yield* compiler.init({ moduleOrPath: options.moduleOrPath });
    yield* compiler.ready;

    const fontData = options.fontData
      ? options.fontData
      : yield* Effect.forEach(defaultFonts, (font) => Effect.tryPromise(() => font.load()));

    for (const data of fontData) {
      yield* compiler.addFont(data);
    }

    yield* compiler.addSource(mainPath, initialSource);
    const hasMainBeforeCompile = yield* compiler.hasFile(mainPath);
    assert(hasMainBeforeCompile, `[${options.runtime}] expected ${mainPath} to exist after addSource`);

    const listedFilesBefore = yield* compiler.listFiles;
    assert(listedFilesBefore.includes(mainPath), `[${options.runtime}] expected listFiles to include ${mainPath}`);

    yield* compiler.setMain(mainPath);
    const firstResult = yield* compiler.compile();
    assert(!!firstResult.svg, `[${options.runtime}] expected first compile to return SVG`);

    yield* compiler.addSource(mainPath, editedSource);
    const secondResult = yield* compiler.compile();
    assert(!!secondResult.svg, `[${options.runtime}] expected second compile to return SVG`);

    yield* compiler.clearFiles;
    const listedFilesAfterClear = yield* compiler.listFiles;
    assert(listedFilesAfterClear.length === 0, `[${options.runtime}] expected no files after clearFiles`);

    yield* compiler.addSource(mainPath, finalSource);
    yield* compiler.setMain(mainPath);
    const finalResult = yield* compiler.compile();
    assert(!!finalResult.svg, `[${options.runtime}] expected final compile to return SVG`);

    return {
      runtime: options.runtime,
      firstSvgLength: firstResult.svg?.length ?? 0,
      secondSvgLength: secondResult.svg?.length ?? 0,
      filesBeforeClear: listedFilesBefore,
      filesAfterClear: listedFilesAfterClear,
    } satisfies E2eScenarioResult;
  });

  const providedProgram = program.pipe(
    Effect.provide(TypstCompilerService.Default),
    Effect.provide(options.backendLayer as never),
  ) as any;

  return await Effect.runPromise(providedProgram);
};
