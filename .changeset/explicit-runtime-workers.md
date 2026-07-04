---
"typst-wasm": major
"@typst-wasm/vite-plugin-typst": patch
---

Make runtime asset and worker configuration explicit.

The Node runtime no longer auto-selects or auto-spawns worker threads. Runtime assets now use one `assets` object: `assets.wasm` is required, and `assets.worker` is a `WorkerHost` factory. Browser and Node entries expose `createWorkerHost(url)` helpers for turning explicit worker URLs into runtime-specific hosts. Workerd rejects worker backends with a clear configuration error. Added explicit `typst-wasm/browser`, `typst-wasm/node`, `typst-wasm/workerd`, and worker subpath exports for bundler-controlled setup.
