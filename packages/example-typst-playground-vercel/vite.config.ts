import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

const crossOriginHeaders = {
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Embedder-Policy": "require-corp",
};

export default defineConfig({
  server: {
    headers: crossOriginHeaders,
  },

  plugins: [
    tanstackStart(),
    nitro({
      preset: "vercel",
      routeRules: {
        "/**": {
          headers: crossOriginHeaders,
        },
      },
      vercel: {
        config: {
          version: 3,
          routes: [
            {
              src: "/(.*)",
              headers: crossOriginHeaders,
              continue: true,
            },
          ],
        },
      },
    }),
    react(),
  ],
});
