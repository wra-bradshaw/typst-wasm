import { readFile } from "node:fs/promises";
import tailwindcss from "@tailwindcss/vite";
import typst from "@typst-wasm/vite-plugin-typst";
import react from "@vitejs/plugin-react";
import { createWorkerHost } from "typst-wasm";
import { defineConfig } from "vite";

const getCoreModule = async (name: string): Promise<WebAssembly.Module> => {
  const url = new URL(
    import.meta.resolve(`@typst-wasm/engine-wasm/worker/${name}`),
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
    typst({
      backend: "worker",
      getCoreModule,
      worker: () =>
        createWorkerHost(
          new URL(import.meta.resolve("typst-wasm/worker/node")),
        ),
      configureCompiler: async (compiler) => {
        for (const fontUrl of fontUrls) {
          await compiler.addFont(new Uint8Array(await readFile(fontUrl)));
        }
      },
    }),
    react(),
    tailwindcss(),
  ],
});
