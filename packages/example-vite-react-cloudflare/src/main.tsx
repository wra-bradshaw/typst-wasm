import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { createTypstCompiler } from "typst-wasm";
import { createWebWorker } from "typst-wasm/worker/browser";
import workerUrl from "typst-wasm/worker/web-worker?worker&url";
import coreUrl from "typst-wasm/engine/engine.core.wasm?url";
import core2Url from "typst-wasm/engine/engine.core2.wasm?url";
import core3Url from "typst-wasm/engine/engine.core3.wasm?url";
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
          worker: () => createWebWorker(workerUrl),
          coreModules: {
            "engine.core.wasm": WebAssembly.compileStreaming(fetch(coreUrl)),
            "engine.core2.wasm": WebAssembly.compileStreaming(fetch(core2Url)),
            "engine.core3.wasm": WebAssembly.compileStreaming(fetch(core3Url)),
          },
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
