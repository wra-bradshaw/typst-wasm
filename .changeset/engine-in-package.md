---
"typst-wasm": major
"@typst-wasm/vite-plugin-typst": patch
"@typst-wasm/example-typst-blog": patch
"@typst-wasm/example-typst-playground-cloudflare": patch
"@typst-wasm/example-typst-playground-vercel": patch
---

Publish the generated engine modules and core WASM assets from `typst-wasm/engine` and `typst-wasm/engine/worker`. The separate `@typst-wasm/engine-wasm` package is no longer published; update engine imports to the new `typst-wasm` subpaths.
