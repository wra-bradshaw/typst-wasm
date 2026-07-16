# typst-wasm

`typst-wasm` is the compiler API and publishes the core WASM assets required by its runtime.

## Browser / Vite Usage

```ts
import { createTypstCompiler } from "typst-wasm";
import { createWebWorker } from "typst-wasm/worker/browser";
import newComputerModernMathBoldUrl from "@typst-wasm/fonts/NewCMMath-Bold.otf?url";
import newComputerModernMathBookUrl from "@typst-wasm/fonts/NewCMMath-Book.otf?url";
import newComputerModernMathRegularUrl from "@typst-wasm/fonts/NewCMMath-Regular.otf?url";
import workerUrl from "typst-wasm/worker/web-worker?url";
import coreUrl from "typst-wasm/engine/engine.core.wasm?url";
import core2Url from "typst-wasm/engine/engine.core2.wasm?url";
import core3Url from "typst-wasm/engine/engine.core3.wasm?url";

const compiler = await createTypstCompiler({
  backend: "auto",
  coreModules: {
    "engine.core.wasm": fetch(coreUrl).then((r) => WebAssembly.compileStreaming(r)),
    "engine.core2.wasm": fetch(core2Url).then((r) => WebAssembly.compileStreaming(r)),
    "engine.core3.wasm": fetch(core3Url).then((r) => WebAssembly.compileStreaming(r)),
  },
  worker: () => createWebWorker(workerUrl),
});

await compiler.addFonts(
  ...[
    newComputerModernMathRegularUrl,
    newComputerModernMathBoldUrl,
    newComputerModernMathBookUrl,
  ].map(async (fontUrl) => {
    const response = await fetch(fontUrl);
    return new Uint8Array(await response.arrayBuffer());
  }),
);
```

## Cloudflare Workers Usage

```ts
import { createTypstCompiler } from "typst-wasm";
import core from "typst-wasm/engine/engine.core.wasm";
import core2 from "typst-wasm/engine/engine.core2.wasm";
import core3 from "typst-wasm/engine/engine.core3.wasm";

const coreModules = {
  "engine.core.wasm": core,
  "engine.core2.wasm": core2,
  "engine.core3.wasm": core3,
};

const compiler = await createTypstCompiler({
  backend: "jspi",
  coreModules,
});
```

## Plain Node Usage

```ts
import { readFile } from "node:fs/promises";
import { createTypstCompiler } from "typst-wasm";
import { createWorkerThread } from "typst-wasm/worker/node";

const compiler = await createTypstCompiler({
  backend: "auto",
  coreModules: {
    "engine.core.wasm": readFile(new URL(import.meta.resolve("typst-wasm/engine/engine.core.wasm"))).then((bytes) => WebAssembly.compile(bytes)),
    "engine.core2.wasm": readFile(new URL(import.meta.resolve("typst-wasm/engine/engine.core2.wasm"))).then((bytes) => WebAssembly.compile(bytes)),
    "engine.core3.wasm": readFile(new URL(import.meta.resolve("typst-wasm/engine/engine.core3.wasm"))).then((bytes) => WebAssembly.compile(bytes)),
  },
  worker: () =>
    createWorkerThread(new URL(import.meta.resolve("typst-wasm/worker/worker-thread"))),
});

try {
  await compiler.addFonts(
    ...[
      new URL(import.meta.resolve("@typst-wasm/fonts/NewCMMath-Regular.otf")),
      new URL(import.meta.resolve("@typst-wasm/fonts/NewCMMath-Bold.otf")),
      new URL(import.meta.resolve("@typst-wasm/fonts/NewCMMath-Book.otf")),
    ].map(async (fontUrl) => new Uint8Array(await readFile(fontUrl))),
  );

  await compiler.addSource("main.typ", "= Hello from Typst");

  const pdf = await compiler.compile({ main: "main.typ", format: "pdf" });
  const svg = await compiler.compile({ format: "svg", pages: "1" });
  const html = await compiler.compile({ format: "html" });

  console.log(pdf.output.byteLength);
  console.log(svg.pages[0]?.output);
  console.log(html.output);
} finally {
  await compiler.dispose();
}
```

Supported compile formats are `pdf`, `png`, `svg`, `html`, and `bundle`. The public API is promise-based; Effect is no longer part of the runtime or package API.

Compile options include `main`, `format`, `inputs`, `pages`, `ppi`, and `pdfStandards`. Browser and server resource loading can be customized with `fetch`, `packageBaseUrl`, and `packageCache`. For JSPI, provide the required core WASM modules in `coreModules`; Cloudflare Workers commonly import them as precompiled modules. Worker deployments provide `worker` as a `WorkerHost` factory created directly or with the `typst-wasm/worker/node` or `typst-wasm/worker/browser` adapter.

For Vercel SSR, compile inside route loaders only when you have explicitly configured a Node-compatible backend. The package will not infer worker files from bundled output.

## Requirements

- [Nix](https://nixos.org) + optional [direnv](https://direnv.net) for the pinned toolchain
- [pnpm](https://pnpm.io) when working outside the Nix shell

## Local setup

### Option 1: Nix + direnv

```bash
direnv allow
```

or

```bash
nix develop
```

### Option 2: CI shell

```bash
nix develop .#ci -c pnpm install --frozen-lockfile
```

### Option 3: Manual JS/runtime setup

Use the Nix shell for reproducible artifact builds. Outside Nix, install pnpm 11 plus Bun and Deno for runtime integration checks.

## Commands

`pnpm build` uses Turbo for workspace task ordering while package artifact builds are produced by Nix-backed derivations.

```bash
pnpm build
pnpm test
pnpm test:integration
nix develop .#ci -c pnpm build
```

Package-specific shells are also available:

```bash
nix develop .#typst-wasm
```

## Release

Publishing is handled by Changesets and GitHub Actions on pushes to `main`.
Changesets keeps `@typst-wasm/fonts` and `typst-wasm` on one synchronized version, updates internal workspace dependencies, and publishes to npm through trusted publishing after the generated version PR is merged.

When a PR needs a release note or version bump, add a changeset:

```bash
pnpm changeset
```

Maintainers merge the generated "Version Packages" PR to publish. The release workflow runs `pnpm version-packages` in the PR step. After that PR is merged, the same workflow runs `pnpm release` directly under GitHub Actions OIDC instead of using an npm token.

Each npm package must have a trusted publisher configured on npmjs.com:

- Publisher: GitHub Actions
- Repository: `wra-bradshaw/typst-wasm`
- Workflow filename: `publish.yml`
- Environment name: `npm`
- Allowed action: `npm publish`

Do not add an `NPM_TOKEN` secret for publishing. The workflow grants `id-token: write`, and npm uses the short-lived OIDC credential for trusted publishing and provenance.

Prereleases use Changesets pre mode:

```bash
pnpm changeset pre enter next
pnpm changeset
pnpm version-packages
pnpm changeset pre exit
```

Do not create manual `vX.Y.Z` tags for npm releases.
