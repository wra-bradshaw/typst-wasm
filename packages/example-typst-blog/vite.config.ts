import tailwindcss from "@tailwindcss/vite";
import typst from "@typst-wasm/vite-plugin-typst";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [typst(), react(), tailwindcss()],
});
