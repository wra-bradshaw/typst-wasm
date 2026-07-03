---
"typst-wasm": major
"@typst-wasm/vite-plugin-typst": major
---

Require callers to provide `loadWasmBytes` explicitly and remove the default packaged WASM resolver.

The `typst-wasm/wasm` subpath and root `wasmBinaryUrl` export have been removed. This avoids eager Node asset resolution during SSR imports and makes WASM loading fully controlled by the consumer or bundler.
