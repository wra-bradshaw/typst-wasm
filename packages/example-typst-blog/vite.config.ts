import { readFile } from "node:fs/promises";
import tailwindcss from "@tailwindcss/vite";
import typst from "@typst-wasm/vite-plugin-typst";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    typst({
      loadWasmBytes: () =>
        readFile(
          new URL("../engine-wasm/dist/typst_wasm_bg.wasm", import.meta.url),
        ),
    }),
    react(),
    tailwindcss(),
  ],
});
