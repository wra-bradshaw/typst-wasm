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
          output: "packages/typst-wasm/reference/api",
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
          output: "packages/vite-plugin-typst/reference/api",
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
        { label: "Overview", link: "/" },
        {
          label: "typst-wasm",
          items: [
            { label: "Overview", link: "/packages/typst-wasm/" },
            {
              label: "Tutorials",
              items: [{ autogenerate: { directory: "packages/typst-wasm/tutorials" } }],
            },
            {
              label: "How-to guides",
              items: [{ autogenerate: { directory: "packages/typst-wasm/how-to" } }],
            },
            {
              label: "Explanation",
              items: [{ autogenerate: { directory: "packages/typst-wasm/explanation" } }],
            },
            { label: "Reference", link: "/packages/typst-wasm/reference/" },
            { label: "API reference", link: "/packages/typst-wasm/reference/api/readme/" },
          ],
        },
        {
          label: "@typst-wasm/vite-plugin-typst",
          items: [
            { label: "Overview", link: "/packages/vite-plugin-typst/" },
            {
              label: "How-to guides",
              items: [{ autogenerate: { directory: "packages/vite-plugin-typst/how-to" } }],
            },
            { label: "Reference", link: "/packages/vite-plugin-typst/reference/" },
            { label: "API reference", link: "/packages/vite-plugin-typst/reference/api/readme/" },
          ],
        },
        {
          label: "Supporting packages",
          items: [{ label: "@typst-wasm/fonts", link: "/packages/supporting/fonts/" }],
        },
      ],
    }),
  ],
});
