---
title: Use the Vite plugin
description: "Import Typst documents as HTML modules in Vite."
---

Install the plugin and its Typst WASM runtime:

```sh
pnpm add @typst-wasm/vite-plugin-typst typst-wasm
```

Add the plugin to `vite.config.ts`. The plugin currently requires an explicit
HTML query on imports:

```ts
import typst from "@typst-wasm/vite-plugin-typst";

export default {
  plugins: [typst({ /* configure a worker or JSPI backend */ })],
};
```

```ts
import document from "./post.typ?typst=html";
```

The module exposes `html`, `metadata`, `diagnostics`, and `dependencies`, both
as named exports and through its default export. The generated HTML is not
sanitized; only render Typst documents you trust.

`?raw` and `?url` remain Vite queries. Other Typst output formats are not yet
supported by this plugin.
