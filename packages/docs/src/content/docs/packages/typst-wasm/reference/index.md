---
title: typst-wasm API reference
description: Typst compiler APIs for browser, server, and Cloudflare Worker runtimes.
---

`typst-wasm` provides a JavaScript API for compiling Typst documents with WebAssembly.

## Choose a runtime

Prefer an explicit runtime subpath in application code:

| Runtime            | Import               |
| ------------------ | -------------------- |
| Browser            | `typst-wasm` |
| Node.js or Bun     | `typst-wasm`    |
| Cloudflare Workers | `typst-wasm` |

See the [API reference](/typst-wasm/packages/typst-wasm/reference/api/readme/) for the compiler API and worker host adapters.

## Guides

- [Use in the browser and with Vite](../how-to/use-browser-and-vite/)
- [Use with Node.js](../how-to/use-node/)
- [Deploy to Cloudflare Workers](../how-to/deploy-to-cloudflare-workers/)
- [Select a compiler backend](../how-to/configure-worker-backends/)
- [Understand the compiler lifecycle](../explanation/compiler-lifecycle/)
