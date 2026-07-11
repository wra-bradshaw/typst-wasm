import type { TypstCompiler } from "typst-wasm";
import { assert, type IntegrationScenarioOptions } from "./harness.ts";

export type CompileFormatResult = {
  pdfFormatSeen: boolean;
  pngOutputLength: number;
  htmlOutputLength: number;
  bundleFileCount: number;
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
  options: IntegrationScenarioOptions,
): Promise<CompileFormatResult> => {
  await compiler.clearFiles();
  await compiler.addSource("main.typ", multipageSource);

  const pdfResult = await compiler.compile({
    main: "main.typ",
    format: "pdf",
  });
  assert(
    pdfResult.format === "pdf" &&
      pdfResult.output.length > 16 &&
      new TextDecoder().decode(pdfResult.output.subarray(0, 5)) === "%PDF-" &&
      new TextDecoder().decode(pdfResult.output.slice(-5)).includes("%%EOF"),
    `[${options.runtime}] expected a non-empty PDF with header and EOF marker`,
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
  assert(
    pngResult.pages[0]?.page === 2,
    `[${options.runtime}] expected selected PNG page number to be 2`,
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

  const htmlResult = await compiler.compile({ format: "html" });
  assert(
    htmlResult.format === "html" &&
      htmlResult.output.includes("<") &&
      htmlResult.output.includes("Page One") &&
      htmlResult.output.includes("Page Two") &&
      /<(html|body|main|section)\b/i.test(htmlResult.output),
    `[${options.runtime}] expected structured HTML containing both pages`,
  );

  await compiler.addSource(
    "bundle.typ",
    `#document("index.html")[= Page One]
#document("second.html")[= Page Two]`,
  );
  const bundleResult = await compiler.compile({
    main: "bundle.typ",
    format: "bundle",
  });
  assert(
    bundleResult.format === "bundle" &&
      bundleResult.files.some(
        (file) =>
          file.path === "index.html" && file.mediaType.startsWith("text/html"),
      ) &&
      bundleResult.files.some(
        (file) =>
          file.path === "second.html" &&
          file.mediaType.startsWith("text/html") &&
          new TextDecoder().decode(file.data).includes("Page Two"),
      ),
    `[${options.runtime}] expected named HTML bundle files with content`,
  );

  return {
    pdfFormatSeen: true,
    pngOutputLength: pngBytes.length,
    htmlOutputLength: htmlResult.output.length,
    bundleFileCount: bundleResult.files.length,
  };
};
