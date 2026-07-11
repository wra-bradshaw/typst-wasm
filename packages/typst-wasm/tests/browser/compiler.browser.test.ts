import {
  CompileError,
  selectAutomaticBackendKind,
  supportsWorkerBackend,
} from "typst-wasm";
import { createBrowserCompiler } from "./harness";

describe("browser compiler", () => {
  it("runs in an isolated browser with the worker backend", () => {
    expect(crossOriginIsolated).toBe(true);
    expect(typeof SharedArrayBuffer).toBe("function");
    const options = {
      backend: "worker" as const,
      worker: () => ({
        listen: () => undefined,
        postMessage: () => undefined,
        terminate: () => undefined,
      }),
    };
    expect(supportsWorkerBackend(options)).toBe(true);
    expect(selectAutomaticBackendKind(options)).toBe("worker");
  });

  it("compiles deterministic Typst source to SVG", async () => {
    await createBrowserCompiler({ backend: "worker" }, async (compiler) => {
      await compiler.addSource(
        "semantic.typ",
        "= Browser worker\nThis is deterministic.",
      );
      const result = await compiler.compile({
        main: "semantic.typ",
        format: "svg",
      });
      expect(result.format).toBe("svg");
      if (result.format !== "svg") return;
      expect(result.pages).toHaveLength(1);
      expect(result.pages[0]?.output).toContain("<svg");
      expect(result.pages[0]?.output).toMatch(/<svg[^>]+xmlns=/);
      expect(result.pages[0]?.output).toContain("<use");
      expect(result.pages[0]?.output).toContain("<symbol");
      expect(
        result.diagnostics.filter((d) => d.severity === "error"),
      ).toHaveLength(0);
    });
  });

  it("reports diagnostics and recovers after invalid source", async () => {
    await createBrowserCompiler({ backend: "worker" }, async (compiler) => {
      await compiler.addSource("recovery.typ", "#let = invalid");
      let error: unknown;
      try {
        await compiler.compile({ main: "recovery.typ", format: "svg" });
      } catch (cause) {
        error = cause;
      }
      expect(error).toBeInstanceOf(CompileError);
      const diagnostics = (error as CompileError).diagnostics;
      expect(diagnostics.length).toBeGreaterThan(0);
      expect(
        diagnostics.some((diagnostic) =>
          diagnostic.file?.includes("recovery.typ"),
        ),
      ).toBe(true);
      expect(
        diagnostics.some((diagnostic) => diagnostic.formatted.length > 0),
      ).toBe(true);
      await compiler.addSource("recovery.typ", "= Recovered");
      const result = await compiler.compile({
        main: "recovery.typ",
        format: "svg",
      });
      expect(result.format).toBe("svg");
      if (result.format === "svg") {
        expect(result.pages[0]?.output).toContain("<svg");
        expect(result.pages[0]?.output).toContain("<use");
      }
    });
  });

  it("isolates concurrent compiler virtual files", async () => {
    const [firstResult, secondResult] = await Promise.all([
      createBrowserCompiler({ backend: "worker" }, async (compiler) => {
        await compiler.addSource("first.typ", "= First compiler");
        const result = await compiler.compile({
          main: "first.typ",
          format: "svg",
        });
        expect(await compiler.listFiles()).toEqual(["first.typ"]);
        return result;
      }),
      createBrowserCompiler({ backend: "worker" }, async (compiler) => {
        await compiler.addSource("second.typ", "= Second compiler");
        const result = await compiler.compile({
          main: "second.typ",
          format: "svg",
        });
        expect(await compiler.listFiles()).toEqual(["second.typ"]);
        return result;
      }),
    ]);
    expect(firstResult.format).toBe("svg");
    expect(secondResult.format).toBe("svg");
    if (firstResult.format === "svg" && secondResult.format === "svg") {
      expect(firstResult.pages[0]?.output).toContain("<svg");
      expect(secondResult.pages[0]?.output).toContain("<svg");
      expect(firstResult.pages[0]?.output).not.toEqual(
        secondResult.pages[0]?.output,
      );
    }
  });
});
