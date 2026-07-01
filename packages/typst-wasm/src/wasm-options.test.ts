import { describe, expect, it } from "vitest";
import { toWasmCompileOptions } from "./wasm";

describe("toWasmCompileOptions", () => {
  it("maps public options to the narrow engine request", () => {
    expect(
      toWasmCompileOptions({
        format: "png",
        main: "main.typ",
        inputs: { mode: "test" },
        pages: "1,3-",
        pdfStandards: ["a-2b"],
        ppi: 96,
      }),
    ).toEqual({
      format: "png",
      main: "main.typ",
      inputs: { mode: "test" },
      pages: "1,3-",
      pdf_standards: ["a-2b"],
      ppi: 96,
    });
  });

  it("defaults to pdf", () => {
    expect(toWasmCompileOptions()).toEqual({
      format: "pdf",
      main: null,
      inputs: null,
      pages: null,
      pdf_standards: null,
      ppi: null,
    });
  });
});
