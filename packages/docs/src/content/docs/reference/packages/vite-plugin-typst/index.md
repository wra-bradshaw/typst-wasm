---
title: '@typst-wasm/vite-plugin-typst'
description: "Compile Typst documents to HTML modules with Vite."
---

`@typst-wasm/vite-plugin-typst` transforms explicit `?typst=html` imports into
modules containing compiled HTML and document metadata.

```ts
import post from "./post.typ?typst=html";

post.html;
post.metadata;
```

The plugin currently supports HTML output only. Use `typst-wasm` directly for
other compilation formats.
