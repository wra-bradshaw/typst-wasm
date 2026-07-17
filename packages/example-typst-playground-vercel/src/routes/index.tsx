import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  compileTypst,
  formatCompileError,
  type PlaygroundFormat,
  type PlaygroundResult,
} from "../compiler";
import useAbortableCallback from "../lib/useAbortableCallback";
import { sampleSource } from "../sample";

const formats: PlaygroundFormat[] = ["html", "pdf", "png", "svg"];

export const Route = createFileRoute("/")({
  loader: async () => {
    // SSR starts with HTML, so the initial document is rendered on the server.
    const result = await compileTypst(sampleSource, "html");
    if (result.format !== "html") throw new Error("Expected HTML SSR output");
    return {
      format: "html" as const,
      output: result.output,
      diagnostics: result.diagnostics,
    };
  },
  component: Playground,
});

function OutputPreview({ result }: { result: PlaygroundResult }) {
  const [url, setUrl] = useState<string | string[] | null>(null);

  useEffect(() => {
    if (typeof URL === "undefined") return;
    const next =
      result.format === "pdf"
        ? URL.createObjectURL(
            new Blob([result.output as unknown as BlobPart], {
              type: "application/pdf",
            }),
          )
        : result.format === "png"
          ? result.pages.map((page) =>
              URL.createObjectURL(
                new Blob([page.output as unknown as BlobPart], {
                  type: "image/png",
                }),
              ),
            )
          : null;
    setUrl(next);
    return () => {
      for (const value of next ? (Array.isArray(next) ? next : [next]) : [])
        URL.revokeObjectURL(value);
    };
  }, [result]);

  switch (result.format) {
    case "html":
      return (
        <article
          className="preview"
          dangerouslySetInnerHTML={{ __html: result.output }}
        />
      );
    case "svg":
      return (
        <div className="preview output-pages">
          {result.pages.map((page) => (
            <article
              key={page.page}
              dangerouslySetInnerHTML={{ __html: page.output }}
            />
          ))}
        </div>
      );
    case "png":
      return (
        <div className="preview output-pages">
          {Array.isArray(url) &&
            result.pages.map((page, index) => (
              <img key={page.page} src={url[index]} alt={`Page ${page.page}`} />
            ))}
        </div>
      );
    case "pdf":
      return (
        <div className="preview pdf-preview">
          {typeof url === "string" ? (
            <>
              <object data={url} type="application/pdf" />
              <a href={url} target="_blank" rel="noreferrer">
                Open PDF
              </a>
            </>
          ) : null}
        </div>
      );
  }
}

function Playground() {
  const initial = Route.useLoaderData();
  const [result, setResult] = useState<PlaygroundResult>(initial);
  const [source, setSource] = useState(sampleSource);
  const [format, setFormat] = useState<PlaygroundFormat>("html");
  const [error, setError] = useState<string | null>(null);
  const [isCompiling, setIsCompiling] = useState(false);

  const { run } = useAbortableCallback(
    async (signal, nextSource: string, nextFormat: PlaygroundFormat) => {
      setIsCompiling(true);
      await compileTypst(nextSource, nextFormat)
        .then((nextResult) => {
          if (signal.aborted) return;
          setResult(nextResult);
          setError(null);
        })
        .catch((reason: unknown) => {
          if (!signal.aborted) setError(formatCompileError(reason));
        });
      if (!signal.aborted) setIsCompiling(false);
    },
  );

  const status = useMemo(
    () =>
      isCompiling
        ? "Compiling"
        : error
          ? "Compile error"
          : `${format.toUpperCase()} preview`,
    [error, format, isCompiling],
  );

  return (
    <main className="shell">
      <section className="pane">
        <div className="pane-header">
          <h1>Typst editor</h1>
        </div>
        <textarea
          className="source"
          spellCheck={false}
          value={source}
          onChange={(event) => {
            const value = event.target.value;
            setSource(value);
            run(value, format);
          }}
        />
      </section>
      <section className="pane">
        <div className="pane-header">
          <h2>Preview</h2>
          <label className="format-select">
            Output{" "}
            <select
              value={format}
              onChange={(event) => {
                const value = event.target.value as PlaygroundFormat;
                setFormat(value);
                run(source, value);
              }}
            >
              {formats.map((value) => (
                <option key={value} value={value}>
                  {value.toUpperCase()}
                </option>
              ))}
            </select>
          </label>
          <span className="status">{status}</span>
        </div>
        {error ? <pre className="error">{error}</pre> : null}
        <OutputPreview result={result} />
        <div className="diagnostics">
          {result.diagnostics.length === 0
            ? ""
            : `${result.diagnostics.length} diagnostic${result.diagnostics.length === 1 ? "" : "s"}`}
        </div>
      </section>
    </main>
  );
}
