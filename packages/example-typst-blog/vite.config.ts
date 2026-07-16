import { readFile } from "node:fs/promises";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import typst from "@typst-wasm/vite-plugin-typst";
import react from "@vitejs/plugin-react";
import { createWorkerThread } from "typst-wasm/worker/node";
import { defineConfig } from "vite";

const fontUrls = [
  new URL(import.meta.resolve("@typst-wasm/fonts/NewCMMath-Regular.otf")),
  new URL(import.meta.resolve("@typst-wasm/fonts/NewCMMath-Bold.otf")),
  new URL(import.meta.resolve("@typst-wasm/fonts/NewCMMath-Book.otf")),
];

export default defineConfig({
  plugins: [
    cloudflare({ viteEnvironment: { name: "ssr" } }),
    tanstackStart({
      prerender: {
        enabled: true,
        autoSubfolderIndex: true,
        autoStaticPathsDiscovery: true,
        concurrency: 14,
        crawlLinks: true,
        filter: ({ path }) => !path.startsWith("/do-not-render-me"),
        retryCount: 2,
        retryDelay: 1000,
        maxRedirects: 5,
        failOnError: true,
      },
    }),
    typst({
      backend: "worker",
      coreModules: {
        "engine.core.wasm": WebAssembly.compile(
          await readFile(
            new URL(import.meta.resolve("typst-wasm/engine/engine.core.wasm")),
          ),
        ),
        "engine.core2.wasm": WebAssembly.compile(
          await readFile(
            new URL(import.meta.resolve("typst-wasm/engine/engine.core2.wasm")),
          ),
        ),
        "engine.core3.wasm": WebAssembly.compile(
          await readFile(
            new URL(import.meta.resolve("typst-wasm/engine/engine.core3.wasm")),
          ),
        ),
      },
      worker: () =>
        createWorkerThread(
          new URL(import.meta.resolve("typst-wasm/worker/worker-thread")),
        ),
      configureCompiler: async (compiler) => {
        await compiler.addFonts(
          ...fontUrls.map(
            async (fontUrl) => new Uint8Array(await readFile(fontUrl)),
          ),
        );
      },
    }),
    react(),
    tailwindcss(),
  ],
});
