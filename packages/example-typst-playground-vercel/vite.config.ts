import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig, type Plugin } from "vite";

const crossOriginHeaders = {
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Embedder-Policy": "require-corp",
};

const previewAssetHeaders = (): Plugin => ({
  name: "preview-asset-headers",
  configurePreviewServer(server) {
    server.middlewares.use((request, response, next) => {
      response.setHeader(
        "Cross-Origin-Opener-Policy",
        crossOriginHeaders["Cross-Origin-Opener-Policy"],
      );
      response.setHeader(
        "Cross-Origin-Embedder-Policy",
        crossOriginHeaders["Cross-Origin-Embedder-Policy"],
      );

      if (request.url?.split("?", 1)[0].endsWith(".wasm")) {
        const setHeader = response.setHeader.bind(response);
        response.setHeader = (name, value) =>
          setHeader(
            name,
            name.toLowerCase() === "content-type" ? "application/wasm" : value,
          );
        response.setHeader("Content-Type", "application/wasm");
      }

      next();
    });
  },
});

export default defineConfig({
  server: {
    headers: crossOriginHeaders,
  },

  ssr: {
    noExternal: ["typst-wasm", "@typst-wasm/engine-wasm"],
  },

  plugins: [
    previewAssetHeaders(),
    tanstackStart(),
    nitro({
      preset: "vercel",
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
