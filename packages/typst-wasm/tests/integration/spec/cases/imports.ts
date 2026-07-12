import { expect } from "@std/expect";
import type { CanonicalCase } from "../types.ts";
import { expectSvg, withCompiler } from "./helpers.ts";

const source = `#import "@preview/wordometer:0.1.5": word-count-of\n#set page(width: auto, height: auto, margin: 10pt)\n#word-count-of[Hello fixture]`;

export const importCases: readonly CanonicalCase[] = [
  {
    id: "imports.package",
    isolation: "shared",
    sharedGroup: "imports",
    run: (context) =>
      withCompiler(context, async (compiler) => {
        await compiler.addSource("main.typ", source);
        expectSvg(await compiler.compile({ main: "main.typ", format: "svg" }));
      }),
  },
  {
    id: "imports.cache-hit",
    isolation: "shared",
    sharedGroup: "imports",
    run: (context) =>
      withCompiler(context, async (compiler) => {
        // Warm this case's own package cache; do not depend on imports.package
        // having run immediately before it.
        await compiler.addSource("main.typ", source);
        await compiler.compile({ main: "main.typ", format: "svg" });
        const requestsBefore = context.packageRequests?.() ?? 0;
        await compiler.compile({ main: "main.typ", format: "svg" });
        // The fixture fetch/cache policy is owned by the adapter. Repeated
        // imports must use the in-memory package cache.
        expectSvg(await compiler.compile({ main: "main.typ", format: "svg" }));
        if (context.packageRequests) {
          expect(context.packageRequests()).toBe(requestsBefore);
        }
      }),
  },
];
