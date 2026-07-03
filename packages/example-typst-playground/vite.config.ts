import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    tanstackStart(),
    nitro({
      cloudflare: {
        wrangler: {
          name: "typst-wasm-playground",
        },
      },
    }),
    react(),
    tailwindcss(),
  ],
});
