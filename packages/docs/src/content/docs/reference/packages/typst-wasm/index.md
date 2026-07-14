---
title: typst-wasm
description: "Typst compiler APIs for browser, server, and Cloudflare Worker runtimes."
---

`typst-wasm` provides a JavaScript API for compiling Typst documents with WebAssembly.

## Choose a runtime

Prefer an explicit runtime subpath in application code:

| Runtime | Import | Worker backend | JSPI |
| --- | --- | --- | --- |
| Browser | `typst-wasm/browser` | Supported when the environment supports workers and `options.worker` is provided | Feature-detected; requires `options.engine` |
| Node.js or Bun | `typst-wasm/node` | Supported when the environment supports workers and `options.worker` is provided | Feature-detected; requires `options.engine` |
| Cloudflare Workers | `typst-wasm/workerd` | Not available | Feature-detected; requires `options.engine` |

The bare `typst-wasm` import uses the package's conditional exports. Explicit subpaths make the selected runtime clear and avoid relying on the resolver's conditions.

## API reference

The generated [API reference](./api/readme/) is organized into:

- **Shared API** — compiler types, compilation options and results, file loaders, package caches, diagnostics, and errors.
- **Browser**, **Node.js**, and **Cloudflare Workers** — runtime-specific compiler factories and capability helpers.

The similarly named runtime functions are separate declarations because their available backends and worker facilities differ. They share the types documented in the Shared API. Worker-backed compilation requires a worker factory, while JSPI-backed compilation requires the engine module.

## Guides

- [Use in the browser and with Vite](/how-to/use-browser-and-vite/)
- [Use with Node.js](/how-to/use-node/)
- [Deploy to Cloudflare Workers](/how-to/deploy-to-cloudflare-workers/)
- [Select a compiler backend](/how-to/configure-worker-backends/)
- [Understand the compiler lifecycle](/explanation/compiler-lifecycle/)

## Worker entrypoints

For explicit worker setup, the package also exports `typst-wasm/worker/web-worker` and `typst-wasm/worker/worker-thread`. Use the web worker entrypoint in browser applications and the worker-thread entrypoint in Node.js applications.
