---
title: Fonts
description: Fonts distributed with @typst-wasm/fonts.
---

Install the package with `npm install @typst-wasm/fonts@1.0.0` (or the
corresponding command for your package manager). Font files are exposed as
package subpath exports and can be resolved by the runtime or bundler.

## Available fonts

- Libertinus Serif: `Regular`, `Semibold`, `Bold`, `Italic`, `SemiboldItalic`, `BoldItalic`
- New Computer Modern text: `NewCM10-Regular`, `NewCM10-Bold`, `NewCM10-Italic`, `NewCM10-BoldItalic`
- New Computer Modern math: `NewCMMath-Regular`, `NewCMMath-Book`, `NewCMMath-Bold`
- DejaVu Sans Mono: `Regular`, `Bold`, `Oblique`, `BoldOblique`

For example, in Node.js:

```ts
import { readFile } from "node:fs/promises";

const font = new Uint8Array(
  await readFile(
    new URL(import.meta.resolve("@typst-wasm/fonts/NewCMMath-Regular.otf")),
  ),
);
await compiler.addFonts(font);
```

In a Vite browser application, append `?url` to the same export and fetch the
resulting URL before passing the bytes to `compiler.addFonts()`.
