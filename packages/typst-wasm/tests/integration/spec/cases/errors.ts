import { expect } from "@std/expect";
import { CompileError } from "typst-wasm";
import type { CanonicalCase } from "../types.ts";
import { expectRejected, expectSvg, withCompiler } from "./helpers.ts";

export const errorCases: readonly CanonicalCase[] = [
  {
    id: "errors.compile-diagnostics",
    isolation: "shared",
    sharedGroup: "errors",
    run: (context) =>
      withCompiler(context, async (compiler) => {
        await compiler.addSource("bad.typ", "#let broken =");
        await expectRejected(
          compiler.compile({ main: "bad.typ", format: "svg" }),
          (error) =>
            error instanceof CompileError &&
            error.diagnostics.length > 0 &&
            error.diagnostics.some(
              (diagnostic) =>
                diagnostic.file === "bad.typ" &&
                diagnostic.message.length > 0 &&
                (diagnostic.line !== undefined ||
                  diagnostic.formatted.includes("bad.typ")),
            ),
        );
      }),
  },
  {
    id: "errors.recovery",
    isolation: "shared",
    sharedGroup: "errors",
    run: (context) =>
      withCompiler(context, async (compiler) => {
        await compiler.addSource(
          "good.typ",
          '#set page(width: auto, height: auto, margin: 10pt)\nInput: #sys.inputs.at("mode", default: "missing")',
        );
        const svg = await compiler.compile({
          main: "good.typ",
          format: "svg",
          inputs: { mode: "integration" },
        });
        expectSvg(svg);
        const html = await compiler.compile({
          main: "good.typ",
          format: "html",
          inputs: { mode: "integration" },
        });
        expect(html.output).toContain("integration");
      }),
  },
  {
    id: "errors.invalid-options",
    isolation: "fresh",
    run: (context) =>
      withCompiler(context, async (compiler) => {
        await compiler.addSource("main.typ", "= Options");
        await expectRejected(
          compiler.compile({ format: "not-a-format" as never }),
        );
        expect(await compiler.hasFile("main.typ")).toBe(true);
      }),
  },
];
