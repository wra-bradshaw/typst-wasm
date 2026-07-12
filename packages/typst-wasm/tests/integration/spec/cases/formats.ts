import { expect } from "@std/expect";
import type { CanonicalCase } from "../types.ts";
import { withCompiler } from "./helpers.ts";

const source = `#set document(
  title: [Compiler Metadata],
  description: [Metadata should not be HTML-specific.],
  author: ("Ada", "Grace"),
  keywords: ("typst", "wasm"),
)
#set page(width: auto, height: auto, margin: 10pt)
#metadata(("answer": 42)) <doc-meta>
= First
#pagebreak()
= Second`;
const withSource = (
  context: Parameters<typeof withCompiler>[0],
  run: Parameters<typeof withCompiler>[1],
) =>
  withCompiler(context, async (compiler) => {
    await compiler.addSource("main.typ", source);
    await compiler.setMain("main.typ");
    await run(compiler);
  });

export const formatCases: readonly CanonicalCase[] = [
  {
    id: "formats.svg",
    isolation: "shared",
    sharedGroup: "formats",
    run: (context) =>
      withSource(context, async (compiler) => {
        const result = await compiler.compile({ format: "svg" });
        if (result.format !== "svg") throw new Error("expected SVG result");
        expect(result.pages.length).toBeGreaterThan(0);
        expect(result.pages[0]?.output).toContain("<svg");
      }),
  },
  {
    id: "formats.pdf",
    isolation: "shared",
    sharedGroup: "formats",
    run: (context) =>
      withSource(context, async (compiler) => {
        const result = await compiler.compile({ format: "pdf" });
        if (result.format !== "pdf") throw new Error("expected PDF result");
        const text = new TextDecoder().decode(result.output);
        expect(text.slice(0, 5)).toBe("%PDF-");
        expect(text.slice(-5)).toContain("%%EOF");
        expect(result.metadata?.title).toBe("Compiler Metadata");
        expect(result.metadata?.description).toBe(
          "Metadata should not be HTML-specific.",
        );
        expect(result.metadata?.author.join(",")).toBe("Ada,Grace");
        expect(result.metadata?.keywords.join(",")).toBe("typst,wasm");
        expect(
          result.metadata?.custom.some(
            (entry) =>
              entry.label === "doc-meta" &&
              typeof entry.value === "object" &&
              entry.value !== null &&
              "answer" in entry.value &&
              entry.value.answer === 42,
          ),
        ).toBe(true);
      }),
  },
  {
    id: "formats.png",
    isolation: "shared",
    sharedGroup: "formats",
    run: (context) =>
      withSource(context, async (compiler) => {
        const result = await compiler.compile({
          format: "png",
          pages: "2",
          ppi: 96,
        });
        if (result.format !== "png") throw new Error("expected PNG result");
        expect(result.pages).toHaveLength(1);
        expect(result.pages[0]?.page).toBe(2);
        expect([
          ...(result.pages[0]?.output ?? new Uint8Array()).subarray(0, 4),
        ]).toEqual([137, 80, 78, 71]);
      }),
  },
  {
    id: "formats.html",
    isolation: "shared",
    sharedGroup: "formats",
    run: (context) =>
      withSource(context, async (compiler) => {
        const result = await compiler.compile({ format: "html" });
        if (result.format !== "html") throw new Error("expected HTML result");
        expect(result.output).toContain("First");
        expect(result.output).toContain("Second");
        expect(result.output).toMatch(/<(html|body|main|section)\b/i);
      }),
  },
  {
    id: "formats.bundle",
    isolation: "shared",
    sharedGroup: "formats",
    run: (context) =>
      withCompiler(context, async (compiler) => {
        await compiler.addSource(
          "bundle.typ",
          `#document("index.html")[= Page One]\n#document("second.html")[= Page Two]`,
        );
        const result = await compiler.compile({
          main: "bundle.typ",
          format: "bundle",
        });
        if (result.format !== "bundle")
          throw new Error("expected bundle result");
        expect(
          result.files.some(
            (file) =>
              file.path === "index.html" &&
              file.mediaType?.startsWith("text/html") === true,
          ),
        ).toBe(true);
        expect(
          result.files.some(
            (file) =>
              file.path === "second.html" &&
              file.mediaType?.startsWith("text/html") === true &&
              new TextDecoder().decode(file.data).includes("Page Two"),
          ),
        ).toBe(true);
      }),
  },
];
