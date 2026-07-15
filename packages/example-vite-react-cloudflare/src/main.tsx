import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { createTypstCompiler, createWebWorker } from "typst-wasm/browser";
import * as engine from "typst-wasm/engine";
import workerUrl from "typst-wasm/worker/web-worker?worker&url";
import regularFontUrl from "@typst-wasm/fonts/NewCMMath-Regular.otf?url";
import "./style.css";

function App() {
  const [svg, setSvg] = useState<string>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    let disposed = false;
    const render = async () => {
      try {
        const compiler = await createTypstCompiler({
          backend: "auto",
          engine,
          worker: () => createWebWorker(workerUrl),
        });
        try {
          await compiler.addFonts(
            fetch(regularFontUrl).then((res) =>
              res.arrayBuffer().then((res) => new Uint8Array(res)),
            ),
          );
          await compiler.addSource(
            "main.typ",
            "= Hello from Vite + React\n\nThis document was compiled in your browser.",
          );
          const result = await compiler.compile({
            main: "main.typ",
            format: "svg",
          });
          if (!disposed) setSvg(result.pages[0]?.output);
        } finally {
          await compiler.dispose();
        }
      } catch (cause) {
        if (!disposed)
          setError(cause instanceof Error ? cause.message : String(cause));
      }
    };
    void render();
    return () => {
      disposed = true;
    };
  }, []);

  return (
    <main>
      <h1>Vite + React + typst-wasm</h1>
      <p>A small static app deployed with Cloudflare Workers Static Assets.</p>
      {error ? (
        <pre className="error">{error}</pre>
      ) : svg ? (
        <div dangerouslySetInnerHTML={{ __html: svg }} />
      ) : (
        <p>Compiling…</p>
      )}
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
