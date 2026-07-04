"use client";

import { useMemo, useState } from "react";
import {
  compileTypstHtml,
  formatCompileError,
  type CompileView,
} from "./browser-compiler";

interface PlaygroundProps {
  initial: CompileView;
  source: string;
}

export default function Playground({ initial, source }: PlaygroundProps) {
  const [preview, setPreview] = useState(initial.html);
  const [diagnostics, setDiagnostics] = useState(initial.diagnostics);
  const [error, setError] = useState<string | null>(null);
  const [isCompiling, setIsCompiling] = useState(false);

  const status = useMemo(() => {
    if (isCompiling) return "Compiling";
    if (error) return "Compile error";
    return "Browser preview";
  }, [error, isCompiling]);

  const compile = (nextSource: string): void => {
    setIsCompiling(true);

    compileTypstHtml(nextSource)
      .then((result) => {
        setPreview(result.html);
        setDiagnostics(result.diagnostics);
        setError(null);
      })
      .catch((reason: unknown) => {
        setError(formatCompileError(reason));
      })
      .finally(() => {
        setIsCompiling(false);
      });
  };

  return (
    <main className="shell">
      <section className="pane">
        <div className="pane-header">
          <h1>Typst editor</h1>
        </div>
        <textarea
          className="source"
          spellCheck={false}
          defaultValue={source}
          onChange={(event) => compile(event.currentTarget.value)}
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
          dangerouslySetInnerHTML={{ __html: error ? "" : preview }}
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
