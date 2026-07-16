---
"typst-wasm": major
---

Unify the compiler API under `typst-wasm`. The `typst-wasm/node`,
`typst-wasm/browser`, and `typst-wasm/workerd` entrypoints are removed.
Use `typst-wasm` for the compiler API and `typst-wasm/worker/node` or
`typst-wasm/worker/browser` for host worker adapters.
