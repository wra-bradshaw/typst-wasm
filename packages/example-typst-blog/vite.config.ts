import { readFile } from "node:fs/promises";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import typst from "@typst-wasm/vite-plugin-typst";
import react from "@vitejs/plugin-react";
import { createWorkerThread } from "typst-wasm";
import { defineConfig } from "vite";

const getCoreModule = async (name: string): Promise<WebAssembly.Module> => {
  const url = new URL(
    import.meta.resolve(`typst-wasm/engine/worker/${name}`),
  );
  return WebAssembly.compile(await readFile(url));
};

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
      getCoreModule,
      worker: () =>
        createWorkerThread(
          new URL(import.meta.resolve("typst-wasm/worker/worker-thread")),
        ),
      configureCompiler: async (compiler) => {
        await compiler.addFonts(
          ...fontUrls.map(async (fontUrl) =>
            new Uint8Array(await readFile(fontUrl)),
          ),
        );
      },
    }),
    react(),
    tailwindcss(),
  ],
});
