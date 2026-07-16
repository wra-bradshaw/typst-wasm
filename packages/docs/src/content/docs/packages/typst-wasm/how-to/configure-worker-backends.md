---
title: Configure compiler backends
description: Choose and configure the worker or JSPI backend.
---

The compiler is always imported from `typst-wasm`. A worker host is an optional
adapter used only by the `worker` backend:

```ts
import { createTypstCompiler } from "typst-wasm";
import { createWebWorker } from "typst-wasm/worker/browser";

const compiler = await createTypstCompiler({
  backend: "worker",
  worker: () => createWebWorker(workerUrl),
  coreModules,
});
```

Use `typst-wasm/worker/node` and `createWorkerThread(workerUrl)` instead for
Node.js or Bun. The adapter creates the host; the worker module itself is the
separate `typst-wasm/worker/web-worker` or `typst-wasm/worker/worker-thread`
package export.

## Automatic selection

`backend: "auto"` selects `worker` when a worker host is configured and the
runtime supports `SharedArrayBuffer` and `Atomics.wait`. Otherwise it selects
`jspi` when the runtime supports JSPI. If neither backend is available,
compiler creation fails. Use `supportsWorkerBackend()`, `supportsJspiBackend()`,
or `selectAutomaticBackendKind()` to inspect capabilities.

## JSPI

The JSPI backend runs without a worker host and is useful in Cloudflare Workers:

```ts
const compiler = await createTypstCompiler({
  backend: "jspi",
  coreModules,
});
```

JSPI support is still experimental in many runtimes. For browser workers, also
configure the required [cross-origin isolation headers](../../deployment/browser-requirements/).
Always call `compiler.dispose()` when the compiler is no longer needed.
