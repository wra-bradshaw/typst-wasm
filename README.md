# typst-wasm

`typst-wasm` is the primary npm package. The WASM engine and bundled default fonts are published as scoped runtime dependencies for users who want to import those assets directly.
When loading the engine asset with a bundler import, add `@typst-wasm/engine-wasm` to the consuming app so package managers can resolve the direct asset import.

## Browser / Vite Usage

```ts
import { createTypstCompiler, createWorkerHost } from "typst-wasm/browser";
import newComputerModernMathBoldUrl from "@typst-wasm/fonts/NewCMMath-Bold.otf?url";
import newComputerModernMathBookUrl from "@typst-wasm/fonts/NewCMMath-Book.otf?url";
import newComputerModernMathRegularUrl from "@typst-wasm/fonts/NewCMMath-Regular.otf?url";
import workerUrl from "typst-wasm/worker/browser?url";
import wasmUrl from "@typst-wasm/engine-wasm/typst_wasm_bg.wasm?url";

const compiler = await createTypstCompiler({
  backend: "auto",
  assets: {
    wasm: async () => {
      const response = await fetch(wasmUrl);
      return response.arrayBuffer();
    },
    worker: () => createWorkerHost(workerUrl),
  },
});

for (const fontUrl of [
  newComputerModernMathRegularUrl,
  newComputerModernMathBoldUrl,
  newComputerModernMathBookUrl,
]) {
  const response = await fetch(fontUrl);
  await compiler.addFont(new Uint8Array(await response.arrayBuffer()));
}
```

## Cloudflare Workers Usage

```ts
import { createTypstCompiler } from "typst-wasm/workerd";
import wasmModule from "@typst-wasm/engine-wasm/typst_wasm_bg.wasm";

const compiler = await createTypstCompiler({
  backend: "jspi",
  assets: {
    wasm: wasmModule,
  },
});
```

## Plain Node Usage

```ts
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { createTypstCompiler, createWorkerHost } from "typst-wasm/node";

const require = createRequire(import.meta.url);
const wasmPath = require.resolve("@typst-wasm/engine-wasm/typst_wasm_bg.wasm");

const compiler = await createTypstCompiler({
  backend: "auto",
  assets: {
    wasm: () => readFile(wasmPath),
    worker: () =>
      createWorkerHost(new URL(import.meta.resolve("typst-wasm/worker/node"))),
  },
});

try {
  for (const fontUrl of [
    new URL(import.meta.resolve("@typst-wasm/fonts/NewCMMath-Regular.otf")),
    new URL(import.meta.resolve("@typst-wasm/fonts/NewCMMath-Bold.otf")),
    new URL(import.meta.resolve("@typst-wasm/fonts/NewCMMath-Book.otf")),
  ]) {
    await compiler.addFont(new Uint8Array(await readFile(fontUrl)));
  }

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

Compile options include `main`, `format`, `inputs`, `pages`, `ppi`, and `pdfStandards`. Browser and server resource loading can be customized with `fetch`, `packageBaseUrl`, and `packageCache` on `createTypstCompiler`. Runtime deployment assets are configured through `assets`: `assets.wasm` is required, and `assets.worker` is a `WorkerHost` factory created directly or with the runtime-specific `createWorkerHost(url)` helper.

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
nix develop .#engine-wasm
nix develop .#typst-wasm
```

## Release

Publishing is handled by Changesets and GitHub Actions on pushes to `main`.
Changesets keeps `@typst-wasm/fonts`, `@typst-wasm/engine-wasm`, and `typst-wasm` on one synchronized version, updates internal workspace dependencies, and publishes to npm through trusted publishing after the generated version PR is merged.

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
