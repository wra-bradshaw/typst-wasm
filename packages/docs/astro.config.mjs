// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import { createStarlightTypeDocPlugin } from "starlight-typedoc";

const [typstWasmTypeDoc, typstWasmApiSidebar] = createStarlightTypeDocPlugin();
const [viteTypeDoc, viteApiSidebar] = createStarlightTypeDocPlugin();

// https://astro.build/config
export default defineConfig({
  site: "https://typst-wasm.github.io",
  base: "/typst-wasm",
  integrations: [
    starlight({
      title: "typst-wasm",
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/typst-wasm/typst-wasm",
        },
      ],
      plugins: [
        typstWasmTypeDoc({
          entryPoints: [
            "./reference-entrypoints/node.ts",
            "./reference-entrypoints/browser.ts",
            "./reference-entrypoints/workerd.ts",
          ],
          tsconfig: "./tsconfig.typedoc.json",
          output: "packages/typst-wasm/reference/api",
          sidebar: { label: "API reference", collapsed: true },
          typeDoc: { disableSources: true },
        }),
        viteTypeDoc({
          entryPoints: ["./reference-entrypoints/vite-plugin.ts"],
          tsconfig: "./tsconfig.typedoc.json",
          output: "packages/vite-plugin-typst/reference/api",
          sidebar: { label: "API reference", collapsed: true },
          typeDoc: { disableSources: true },
        }),
      ],
      sidebar: [
        { label: "Overview", link: "/" },
        {
          label: "typst-wasm",
          items: [
            { label: "Overview", link: "/packages/typst-wasm/" },
            {
              label: "Getting started",
              items: [
                {
                  autogenerate: {
                    directory: "packages/typst-wasm/getting-started",
                  },
                },
              ],
            },
            {
              label: "Deployment",
              items: [
                {
                  autogenerate: {
                    directory: "packages/typst-wasm/deployment",
                  },
                },
              ],
            },
            {
              label: "Tutorials",
              items: [
                {
                  autogenerate: { directory: "packages/typst-wasm/tutorials" },
                },
              ],
            },
            {
              label: "How-to guides",
              items: [
                { autogenerate: { directory: "packages/typst-wasm/how-to" } },
              ],
            },
            {
              label: "Explanation",
              items: [
                {
                  autogenerate: {
                    directory: "packages/typst-wasm/explanation",
                  },
                },
              ],
            },
            typstWasmApiSidebar,
          ],
        },
        {
          label: "@typst-wasm/vite-plugin-typst",
          items: [
            { label: "Overview", link: "/packages/vite-plugin-typst/" },
            {
              label: "How-to guides",
              items: [
                {
                  autogenerate: {
                    directory: "packages/vite-plugin-typst/how-to",
                  },
                },
              ],
            },
            viteApiSidebar,
          ],
        },
        {
          label: "Supporting packages",
          items: [
            { label: "@typst-wasm/fonts", link: "/packages/supporting/fonts/" },
          ],
        },
      ],
    }),
  ],
});
