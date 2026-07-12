import { expect } from "@std/expect";
import type { CanonicalCase } from "../types.ts";
import { expectSvg } from "./helpers.ts";

export const concurrencyCases: readonly CanonicalCase[] = [
  {
    id: "concurrency.compiler-isolation",
    isolation: "self-managed",
    run: async (context) => {
      const first = context.createCompiler();
      const second = context.createCompiler();
      const [left, right] = await Promise.all([first, second]);
      try {
        await Promise.all([
          left.addSource(
            "left.typ",
            "#set page(width: 100pt, height: auto, margin: 10pt)\n= Left",
          ),
          right.addSource(
            "right.typ",
            "#set page(width: 200pt, height: auto, margin: 10pt)\n= Right",
          ),
        ]);
        const [leftResult, rightResult] = await Promise.all([
          left.compile({ main: "left.typ", format: "svg" }),
          right.compile({ main: "right.typ", format: "svg" }),
        ]);
        expectSvg(leftResult);
        expectSvg(rightResult);
        if (leftResult.format === "svg" && rightResult.format === "svg") {
          expect(leftResult.pages[0]?.output).not.toBe(
            rightResult.pages[0]?.output,
          );
        }
        expect(await left.hasFile("right.typ")).toBe(false);
        expect(await right.hasFile("left.typ")).toBe(false);

        await Promise.all([
          left.addSource("a.typ", "= A"),
          left.addSource("b.typ", "= B"),
        ]);
        const files = await left.listFiles();
        expect(files).toContain("a.typ");
        expect(files).toContain("b.typ");
        expect(await right.hasFile("a.typ")).toBe(false);
      } finally {
        await Promise.all([left.dispose(), right.dispose()]);
      }
    },
  },
  {
    id: "concurrency.package-loading",
    isolation: "self-managed",
    run: async (context) => {
      const [first, second] = await Promise.all([
        context.createCompiler({ packageCache: false }),
        context.createCompiler({ packageCache: false }),
      ]);
      const source =
        '#import "@preview/wordometer:0.1.5": word-count-of\n#word-count-of[parallel]';
      try {
        await Promise.all([
          first.addSource("one.typ", source),
          second.addSource("two.typ", source),
        ]);
        const [left, right] = await Promise.all([
          first.compile({ main: "one.typ", format: "svg" }),
          second.compile({ main: "two.typ", format: "svg" }),
        ]);
        expectSvg(left);
        expectSvg(right);
      } finally {
        await Promise.allSettled([first.dispose(), second.dispose()]);
      }
    },
  },
];
