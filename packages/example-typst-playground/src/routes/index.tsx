import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  compileTypstHtml,
  formatCompileError,
  type CompileView,
} from "../lib/compile";
import { sampleSource } from "../lib/sample";
import useAbortableCallback from "../lib/useAbortableCallback";

export const Route = createFileRoute("/")({
  loader: async () => compileTypstHtml(sampleSource),
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
        setError(formatCompileError(reason));
      });

    setIsCompiling(false);
  });

  const status = useMemo(() => {
    if (isCompiling) return "Compiling";
    if (error) return "Compile error";
    return "Browser preview";
  }, [error, isCompiling]);

  return (
    <main className="min-h-screen px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <section className="flex min-h-[calc(100vh-2.5rem)] flex-col rounded-md border border-stone-300 bg-white">
          <div className="border-b border-stone-200 px-4 py-3">
            <h1 className="text-base font-semibold text-stone-950">
              Typst editor
            </h1>
          </div>
          <textarea
            className="min-h-[26rem] flex-1 resize-none border-0 bg-stone-950 p-4 font-mono text-sm leading-6 text-stone-50 outline-none"
            spellCheck={false}
            defaultValue={sampleSource}
            onChange={(event) => run(event.target.value)}
          />
        </section>

        <section className="flex min-h-[calc(100vh-2.5rem)] flex-col rounded-md border border-stone-300 bg-white">
          <div className="flex items-center justify-between gap-3 border-b border-stone-200 px-4 py-3">
            <h2 className="text-base font-semibold text-stone-950">Preview</h2>
            <span className="rounded border border-stone-300 px-2 py-1 text-xs font-medium text-stone-700">
              {status}
            </span>
          </div>
          {error ? (
            <pre className="m-4 overflow-auto rounded bg-red-50 p-4 text-sm whitespace-pre-wrap text-red-900">
              {error}
            </pre>
          ) : (
            <article
              className="prose flex-1 overflow-auto p-5"
              dangerouslySetInnerHTML={{ __html: preview }}
            />
          )}
          {diagnostics.length > 0 ? (
            <div className="border-t border-stone-200 px-4 py-3 text-xs text-stone-600">
              {diagnostics.length} diagnostic
              {diagnostics.length === 1 ? "" : "s"}
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
