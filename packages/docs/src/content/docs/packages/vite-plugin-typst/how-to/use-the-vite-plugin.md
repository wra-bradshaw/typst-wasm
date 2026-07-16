---
title: Import Typst documents with Vite
description: Import Typst documents as HTML modules in Vite.
---

import { Aside, Steps, Tabs, TabItem } from '@astrojs/starlight/components';

The plugin transforms explicit `?typst=html` imports into modules containing compiled HTML and document metadata. It compiles at build time; it is different from using `typst-wasm` directly in a browser worker.

<Steps>

1. **Install the packages**

   <Tabs syncKey="package-manager">
   <TabItem label="npm">

   ```sh
   npm install @typst-wasm/vite-plugin-typst typst-wasm @typst-wasm/fonts
   ```

   </TabItem>
   <TabItem label="pnpm">

   ```sh
   pnpm add @typst-wasm/vite-plugin-typst typst-wasm @typst-wasm/fonts
   ```

   </TabItem>
   <TabItem label="Yarn">

   ```sh
   yarn add @typst-wasm/vite-plugin-typst typst-wasm @typst-wasm/fonts
   ```

   </TabItem>
   <TabItem label="Bun">

   ```sh
   bun add @typst-wasm/vite-plugin-typst typst-wasm @typst-wasm/fonts
   ```

   </TabItem>
   </Tabs>

2. **Register the plugin**

   Add it to `vite.config.ts`:

   ```ts
   import { readFile } from "node:fs/promises";
   import { createWorkerThread } from "typst-wasm/node";
   import typst from "@typst-wasm/vite-plugin-typst";

   export default {
     plugins: [
       typst({
         backend: "auto",
         coreModules: {
           "engine.core.wasm": WebAssembly.compile(
             await readFile(
               new URL(
                 import.meta.resolve("typst-wasm/engine/engine.core.wasm"),
               ),
             ),
           ),
           "engine.core2.wasm": WebAssembly.compile(
             await readFile(
               new URL(
                 import.meta.resolve("typst-wasm/engine/engine.core2.wasm"),
               ),
             ),
           ),
           "engine.core3.wasm": WebAssembly.compile(
             await readFile(
               new URL(
                 import.meta.resolve("typst-wasm/engine/engine.core3.wasm"),
               ),
             ),
           ),
         },
         worker: () =>
           createWorkerThread(
             new URL(import.meta.resolve("typst-wasm/worker/worker-thread")),
           ),
         configureCompiler: async (compiler) => {
           const font = await readFile(
             new URL(
               import.meta
                 .resolve("@typst-wasm/fonts/LibertinusSerif-Regular.otf"),
             ),
           );
           await compiler.addFonts(new Uint8Array(font));
         },
       }),
     ],
   };
   ```

3. **Import a Typst document**

   ```ts
   /// <reference types="@typst-wasm/vite-plugin-typst/client" />
   import document from "./post.typ?typst=html";

   console.log(document.html);
   console.log(document.metadata);
   ```

4. **Render or store the HTML**

   The generated HTML is not sanitized. Only render documents you trust, or sanitize it before inserting it into the DOM. The module also includes `diagnostics` and `dependencies`.

</Steps>

<Aside type="note" title="Output formats">
  The plugin currently supports HTML output only. Use the [runtime getting-started guides](/typst-wasm/packages/typst-wasm/getting-started/) for PDF, PNG, SVG, or bundle output.
</Aside>

`?raw` and `?url` remain regular Vite queries. The Typst query must be explicit: `?typst=html`.
