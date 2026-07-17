---
title: typst-wasm API reference
description: Typst compiler APIs for browser, server, and Cloudflare Worker runtimes.
---

`typst-wasm` provides a JavaScript API for compiling Typst documents with WebAssembly. The compiler API is shared by every runtime; worker hosts are supplied by separate adapters.

## Imports

Import the compiler and backend utilities from the package root. Only import a worker adapter when using the worker backend:

| Purpose                    | Import                      |
| -------------------------- | --------------------------- |
| Compiler API and types     | `typst-wasm`                |
| Browser worker host        | `typst-wasm/worker/browser` |
| Node.js worker-thread host | `typst-wasm/worker/node`    |
| Deno or Bun Web Worker host | `typst-wasm/worker/browser` |

Cloudflare Workers uses the root compiler API with `backend: "jspi"` and does not need a worker adapter. Use the **API reference** section in the sidebar for the complete compiler API and host adapters.
