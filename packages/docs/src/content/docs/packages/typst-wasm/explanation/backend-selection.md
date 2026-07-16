---
title: Backend selection
description: Understand how typst-wasm selects a compiler backend.
---

`typst-wasm` has one compiler API and two runtime backends:

- **`worker`** runs the engine in a dedicated worker. It requires a `WorkerHost`,
  `SharedArrayBuffer`, and `Atomics.wait`.
- **`jspi`** runs the engine on the current thread using WebAssembly JavaScript
  Promise Integration. It does not require a worker, but requires runtime JSPI
  support.

With `backend: "auto"`, selection is deterministic: a configured and supported
worker is preferred, then JSPI is tried. If neither is supported, compiler
creation reports that no compatible backend is available. Explicitly selecting
`worker` or `jspi` is useful when deployment constraints require a particular
backend.

The compiler package does not choose a host adapter based on the runtime. Import
the host explicitly when using workers:

```ts
import { createTypstCompiler } from "typst-wasm";
import { createWorkerThread } from "typst-wasm/worker/node";

const compiler = await createTypstCompiler({
  backend: "worker",
  worker: () => createWorkerThread(workerUrl),
  coreModules,
});
```

The browser adapter is `typst-wasm/worker/browser`. Cloudflare Workers normally
use the root API with `backend: "jspi"` and no worker adapter.
