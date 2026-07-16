---
"typst-wasm": major
"@typst-wasm/vite-plugin-typst": patch
"@typst-wasm/example-typst-blog": patch
"@typst-wasm/example-typst-playground-cloudflare": patch
"@typst-wasm/example-typst-playground-vercel": patch
---

Publish the core WASM assets from `typst-wasm/engine`. The generated engine modules are bundled into the compiler and worker entrypoints rather than exposed as package exports. The separate `@typst-wasm/engine-wasm` package is no longer published.
