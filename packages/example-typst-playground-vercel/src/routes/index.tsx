import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import {
  compileTypstHtml,
  formatCompileError,
  type CompileView,
} from "../browser-compiler";
import useAbortableCallback from "../lib/useAbortableCallback";
import { sampleSource } from "../sample";

const getInitialPreview = createServerFn({ method: "GET" }).handler(async () => {
  const { getRequestUrl } = await import("@tanstack/react-start/server");
  const { compileTypstHtml } = await import("../lib/compile.server");
  return compileTypstHtml(sampleSource, getRequestUrl().origin);
});

export const Route = createFileRoute("/")({
  loader: () => getInitialPreview(),
  component: Playground,
});

function Playground() {
  const initial = Route.useLoaderData() as CompileView;
  const [preview, setPreview] = useState(initial.html);
  const [diagnostics, setDiagnostics] = useState(initial.diagnostics);
  const [error, setError] = useState<string | null>(null);
  const [isCompiling, setIsCompiling] = useState<boolean>(false);

  const { run } = useAbortableCallback(async (signal, source: string) => {
    setIsCompiling(true);

    await compileTypstHtml(source)
      .then((result) => {
        if (signal.aborted) return;
        setPreview(result.html);
        setDiagnostics(result.diagnostics);
        setError(null);
      })
      .catch((reason: unknown) => {
        if (signal.aborted) return;
        setError(formatCompileError(reason));
      });

    if (!signal.aborted) {
      setIsCompiling(false);
    }
  });

  const status = useMemo(() => {
    if (isCompiling) return "Compiling";
    if (error) return "Compile error";
    return "Browser preview";
  }, [error, isCompiling]);

  return (
    <main className="shell">
      <section className="pane">
        <div className="pane-header">
          <h1>Typst editor</h1>
        </div>
        <textarea
          className="source"
          spellCheck={false}
          defaultValue={sampleSource}
          onChange={(event) => run(event.target.value)}
        />
      </section>

      <section className="pane">
        <div className="pane-header">
          <h2>Preview</h2>
          <span className="status">{status}</span>
        </div>
        {error ? <pre className="error">{error}</pre> : null}
        <article
          className="preview"
          dangerouslySetInnerHTML={{ __html: preview }}
        />
        <div className="diagnostics">
          {diagnostics.length === 0
            ? ""
            : `${diagnostics.length} diagnostic${
                diagnostics.length === 1 ? "" : "s"
              }`}
        </div>
      </section>
    </main>
  );
}
