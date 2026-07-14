// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import { createStarlightTypeDocPlugin } from "starlight-typedoc";

const [typstWasmTypeDoc] = createStarlightTypeDocPlugin();
const [viteTypeDoc] = createStarlightTypeDocPlugin();

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
            "./reference-entrypoints/shared-classes.ts",
            "./reference-entrypoints/shared-interfaces.ts",
            "./reference-entrypoints/shared-type-aliases.ts",
            "./reference-entrypoints/browser-functions.ts",
            "./reference-entrypoints/node-functions.ts",
            "./reference-entrypoints/workerd-functions.ts",
          ],
          tsconfig: "./tsconfig.typedoc.json",
          output: "reference/packages/typst-wasm/api",
          sidebar: { label: "API reference", collapsed: true },
          typeDoc: {
            entryPointStrategy: "resolve",
            router: "module",
            exclude: ["**/*.test.ts", "**/internal/**"],
            readme: "none",
            categorizeByGroup: false,
            excludeReferences: true,
            hideGenerator: true,
          },
        }),
        viteTypeDoc({
          entryPoints: [
            "./reference-entrypoints/vite-interfaces.ts",
            "./reference-entrypoints/vite-functions.ts",
          ],
          tsconfig: "./tsconfig.typedoc.json",
          output: "reference/packages/vite-plugin-typst/api",
          sidebar: { label: "API reference", collapsed: true },
          typeDoc: {
            entryPointStrategy: "resolve",
            router: "module",
            exclude: ["**/*.test.ts", "**/internal/**"],
            readme: "none",
            categorizeByGroup: false,
            excludeExternals: true,
            externalPattern: ["**/packages/typst-wasm/**"],
            hideGenerator: true,
          },
        }),
      ],
      sidebar: [
        {
          label: "Tutorials",
          items: [{ autogenerate: { directory: "tutorials" } }],
        },
        {
          label: "How-to guides",
          items: [{ autogenerate: { directory: "how-to" } }],
        },
        {
          label: "Explanation",
          items: [{ autogenerate: { directory: "explanation" } }],
        },
        {
          label: "Reference",
          items: [
            "reference",
            {
              label: "typst-wasm",
              items: [
                { label: "Overview", link: "/reference/packages/typst-wasm/" },
                {
                  label: "Shared API — Classes",
                  link: "/reference/packages/typst-wasm/api/shared-api--classes/",
                },
                {
                  label: "Shared API — Interfaces",
                  link: "/reference/packages/typst-wasm/api/shared-api--interfaces/",
                },
                {
                  label: "Shared API — Type Aliases",
                  link: "/reference/packages/typst-wasm/api/shared-api--type-aliases/",
                },
                {
                  label: "Browser — Functions",
                  link: "/reference/packages/typst-wasm/api/browser--functions/",
                },
                {
                  label: "Node.js — Functions",
                  link: "/reference/packages/typst-wasm/api/nodejs--functions/",
                },
                {
                  label: "Cloudflare Workers — Functions",
                  link: "/reference/packages/typst-wasm/api/cloudflare-workers--functions/",
                },
              ],
            },
            {
              label: "@typst-wasm/vite-plugin-typst",
              items: [
                {
                  label: "Overview",
                  link: "/reference/packages/vite-plugin-typst/",
                },
                {
                  label: "Interfaces",
                  link: "/reference/packages/vite-plugin-typst/api/vite-plugin--interfaces/",
                },
                {
                  label: "Functions",
                  link: "/reference/packages/vite-plugin-typst/api/vite-plugin--functions/",
                },
              ],
            },
            "reference/packages/engine-wasm",
            "reference/packages/fonts",
          ],
        },
      ],
    }),
  ],
});
