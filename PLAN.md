# Unify typst-wasm Runtime Entry Points

## 1. Make the root API runtime-neutral

Modify `packages/typst-wasm/src/index.ts` to export:

- `createTypstCompiler`
- `supportsWorkerBackend()`
- `supportsJspiBackend()`
- `selectAutomaticBackendKind(options)`
- public types and errors

Remove:

- `src/index.browser.ts`
- `src/index.workerd.ts`
- `src/runtime/node.ts`
- `src/runtime/browser.ts`
- `src/runtime/workerd.ts`
- the now-unused `src/runtime/` directory
- `TypstRuntime`
- `createTypstCompilerWithRuntime`

`createTypstCompiler` will directly construct the compiler without a runtime object.

## 2. Simplify backend selection

Refactor `src/backends/index.ts`:

- Remove runtime injection entirely.
- Use `options.worker` directly.
- Make `supportsWorkerBackend()` only test platform primitives.
- Keep `supportsJspiBackend()` runtime-independent.
- Automatic selection:

```ts
if (options.worker && supportsWorkerBackend()) return "worker";
if (supportsJspiBackend()) return "jspi";
return "none";
```

Explicit worker selection should separately report:

- no worker factory configured
- worker primitives unavailable

## 3. Separate host adapters from worker executables

The current `src/worker/node.ts` and `src/worker/browser.ts` are worker executables. Rename them internally to:

- `src/worker/worker-thread.ts`
- `src/worker/web-worker.ts`

Create host-side adapter modules:

- `src/worker/host-node.ts` → `createWorkerThread`
- `src/worker/host-browser.ts` → `createWebWorker`

New public imports:

```ts
import { createWorkerThread } from "typst-wasm/worker/node";
import { createWebWorker } from "typst-wasm/worker/browser";
```

Keep the executable exports:

```ts
typst-wasm/worker/worker-thread
typst-wasm/worker/web-worker
```

They must remain separate because they run inside different worker environments.

## 4. Replace package exports

Update `packages/typst-wasm/package.json`:

- Make `"."` point to one `dist/index.js`.
- Remove conditional `node`, `browser`, and `workerd` exports.
- Remove:
  - `./node`
  - `./browser`
  - `./workerd`
- Add:
  - `./worker/node`
  - `./worker/browser`
- Retain core WASM asset exports; bundle generated engine modules internally.

## 5. Update the build

Update `tsdown.config.ts`:

- Build the unified root `index`.
- Build `worker/node` and `worker/browser` host adapters.
- Continue building the two worker executable bundles.
- Rename source entry mappings accordingly.
- Stop building the unexported `public-api` artifact.
- Ensure the root bundle has no Node or browser-specific value imports.

## 6. Migrate all consumers

Replace imports throughout:

```text
typst-wasm/node      → typst-wasm
typst-wasm/browser   → typst-wasm
typst-wasm/workerd   → typst-wasm
```

Move helper imports to the new paths:

```text
createWorkerThread → typst-wasm/worker/node
createWebWorker    → typst-wasm/worker/browser
```

Update examples, `vite-plugin-typst`, integration contexts, and tests.

## 7. Update documentation and TypeDoc

Remove the runtime-entrypoint documentation and replace it with:

- `typst-wasm` — compiler API
- `typst-wasm/worker/node` — Node/Bun host adapter
- `typst-wasm/worker/browser` — browser host adapter
- worker executable and core WASM asset documentation

Update README, package docs, deployment guides, and reference entrypoints.

## 8. Rewrite tests and validation

Update backend tests to remove fake `TypstRuntime` objects.

Add coverage for:

- capability-only worker detection
- capability-only JSPI detection
- automatic backend selection with/without `options.worker`
- explicit worker selection failures
- unified root imports across Node, browser, Deno, and workerd

Run:

```bash
pnpm --filter typst-wasm build
pnpm --filter typst-wasm lint
pnpm --filter typst-wasm test
pnpm --filter typst-wasm knip
```

Also build the examples and documentation and run the entire CI tests with nix develop .#ci

## 9. DO NOT ADD A CHANGESET. You are done!
