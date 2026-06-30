import { CompileError, type TypstCompiler } from "typst-wasm";
import { assert, assertRejects, type E2eScenarioOptions } from "./harness.ts";

export type CompileFormatResult = {
  pdfFormatSeen: boolean;
  pngOutputLength: number;
  htmlFeatureErrorSeen: boolean;
  bundleFeatureErrorSeen: boolean;
};

const multipageSource = `#set document(
  title: [Compiler Metadata],
  description: [Metadata should not be HTML-specific.],
  author: ("Ada", "Grace"),
  keywords: ("typst", "wasm"),
)
#set page(width: auto, height: auto, margin: 10pt)
#metadata(("answer": 42)) <doc-meta>
= Page One
#pagebreak()
= Page Two`;

export const runCompileFormatScenario = async (
  compiler: TypstCompiler,
  options: E2eScenarioOptions,
): Promise<CompileFormatResult> => {
  await compiler.clearFiles();
  await compiler.addSource("main.typ", multipageSource);

  const pdfResult = await compiler.compile({
    main: "main.typ",
    format: "pdf",
  });
  assert(
    pdfResult.format === "pdf",
    `[${options.runtime}] expected PDF result format`,
  );
  assert(
    pdfResult.metadata?.title === "Compiler Metadata" &&
      pdfResult.metadata.description ===
        "Metadata should not be HTML-specific." &&
      pdfResult.metadata.author.join(",") === "Ada,Grace" &&
      pdfResult.metadata.keywords.join(",") === "typst,wasm" &&
      pdfResult.metadata.custom.some(
        (entry) =>
          entry.label === "doc-meta" &&
          typeof entry.value === "object" &&
          entry.value !== null &&
          "answer" in entry.value &&
          entry.value.answer === 42,
      ),
    `[${options.runtime}] expected document metadata on PDF result`,
  );

  const pngResult = await compiler.compile({
    format: "png",
    pages: "2",
    ppi: 96,
  });
  assert(
    pngResult.format === "png" && pngResult.pages.length === 1,
    `[${options.runtime}] expected one PNG page for pages: "2"`,
  );
  const pngBytes = pngResult.pages[0]?.output ?? new Uint8Array();
  assert(
    pngBytes.length > 8 &&
      pngBytes[0] === 0x89 &&
      pngBytes[1] === 0x50 &&
      pngBytes[2] === 0x4e &&
      pngBytes[3] === 0x47,
    `[${options.runtime}] expected PNG signature`,
  );

  await assertRejects(
    compiler.compile({ format: "html" }),
    (error) =>
      error instanceof CompileError &&
      error.diagnostics?.some((diagnostic) =>
        diagnostic.message.includes("html export"),
      ) === true,
    `[${options.runtime}] expected HTML format to reject with feature diagnostic`,
  );

  await assertRejects(
    compiler.compile({ format: "bundle" }),
    (error) =>
      error instanceof CompileError &&
      error.diagnostics?.some((diagnostic) =>
        diagnostic.message.includes("html export"),
      ) === true,
    `[${options.runtime}] expected bundle format to reject with feature diagnostic`,
  );

  return {
    pdfFormatSeen: true,
    pngOutputLength: pngBytes.length,
    htmlFeatureErrorSeen: true,
    bundleFeatureErrorSeen: true,
  };
};
