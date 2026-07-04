---
"@typst-wasm/fonts": major
"typst-wasm": major
"@typst-wasm/vite-plugin-typst": major
---

Make `@typst-wasm/fonts` a file-only package.

The fonts package no longer exports JavaScript descriptors or `loadDefaultFonts`; it only exposes the bundled `.otf` files as explicit package subpaths. `typst-wasm` no longer re-exports the fonts package, and the Vite plugin no longer loads bundled fonts implicitly. Applications should import or resolve the font files they need and add them with `compiler.addFont(...)`.
