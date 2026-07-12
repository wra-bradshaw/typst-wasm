import { expect } from "@std/expect";
import type { CanonicalCase } from "../types.ts";
import { expectRejected, expectSvg, withCompiler } from "./helpers.ts";

export const lifecycleCases: readonly CanonicalCase[] = [
  {
    id: "lifecycle.files-and-main",
    isolation: "shared",
    sharedGroup: "lifecycle",
    run: (context) =>
      withCompiler(context, async (compiler) => {
        await compiler.addSource("main.typ", '= Main\n#read("data.txt")');
        await compiler.addFile("data.txt", new TextEncoder().encode("fixture"));
        const font = context.fonts[0];
        if (!font) throw new Error("integration fixture has no fonts");
        await compiler.addFont(font);
        await compiler.setMain("main.typ");
        expect(await compiler.hasFile("main.typ")).toBe(true);
        expect(await compiler.hasFile("data.txt")).toBe(true);
        expect((await compiler.listFiles()).sort()).toEqual(
          ["data.txt", "main.typ"].sort(),
        );
        expectSvg(await compiler.compile({ main: "main.typ", format: "svg" }));
        await compiler.removeFile("data.txt");
        expect(await compiler.hasFile("data.txt")).toBe(false);
        await expectRejected(
          compiler.compile({ main: "main.typ", format: "svg" }),
        );
        await compiler.clearFiles();
        expect(await compiler.listFiles()).toHaveLength(0);
        await compiler.addSource("main.typ", "= After clear");
        expectSvg(await compiler.compile({ main: "main.typ", format: "svg" }));
      }),
  },
  {
    id: "lifecycle.import-and-data",
    isolation: "shared",
    sharedGroup: "lifecycle",
    run: (context) =>
      withCompiler(context, async (compiler) => {
        await compiler.addSource(
          "main.typ",
          '#import "partial.typ": message\n#let data = read("data.txt")\n#message\n#data',
        );
        await compiler.addSource(
          "partial.typ",
          "#let message = [Imported text]",
        );
        await compiler.addFile(
          "data.txt",
          new TextEncoder().encode("Binary file text"),
        );
        const result = await compiler.compile({
          main: "main.typ",
          format: "html",
        });
        if (result.format !== "html") throw new Error("expected HTML result");
        expect(result.output).toContain("Imported text");
        expect(result.output).toContain("Binary file text");
      }),
  },
  {
    id: "lifecycle.edit-and-recompile",
    isolation: "shared",
    sharedGroup: "lifecycle",
    run: (context) =>
      withCompiler(context, async (compiler) => {
        await compiler.clearFiles();
        await compiler.addSource("main.typ", "= Original");
        expectSvg(await compiler.compile({ main: "main.typ", format: "svg" }));
        await compiler.removeFile("main.typ");
        await compiler.addSource("main.typ", "= Updated");
        expectSvg(await compiler.compile({ main: "main.typ", format: "svg" }));
      }),
  },
  {
    id: "lifecycle.dispose",
    isolation: "fresh",
    run: async (context) => {
      const compiler = await context.createCompiler();
      try {
        await compiler.addSource("main.typ", "= Before dispose");
      } finally {
        await compiler.dispose();
      }
      let rejected = false;
      try {
        await compiler.compile({ format: "svg" });
      } catch {
        rejected = true;
      }
      expect(rejected).toBe(true);
    },
  },
];
