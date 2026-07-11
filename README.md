# typst-wasm

`typst-wasm` is the compiler API. `@typst-wasm/engine-wasm` publishes JCO's generated engine modules and core WASM assets.

## Browser / Vite Usage

```ts
import { createTypstCompiler, createWorkerHost } from "typst-wasm/browser";
import newComputerModernMathBoldUrl from "@typst-wasm/fonts/NewCMMath-Bold.otf?url";
import newComputerModernMathBookUrl from "@typst-wasm/fonts/NewCMMath-Book.otf?url";
import newComputerModernMathRegularUrl from "@typst-wasm/fonts/NewCMMath-Regular.otf?url";
import workerUrl from "typst-wasm/worker/browser?url";
import * as engine from "@typst-wasm/engine-wasm/jspi";

const compiler = await createTypstCompiler({
  backend: "auto",
  engine,
  worker: () => createWorkerHost(workerUrl),
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
import * as engine from "@typst-wasm/engine-wasm/jspi";
import core from "@typst-wasm/engine-wasm/jspi/engine.core.wasm";

const coreModules = new Map([["engine.core.wasm", core]]);

const compiler = await createTypstCompiler({
  backend: "jspi",
  engine,
  getCoreModule: (name) => {
    const module = coreModules.get(name);
    if (!module) throw new Error(`Unknown JSPI core module: ${name}`);
    return module;
  },
});
```

## Plain Node Usage

```ts
import { readFile } from "node:fs/promises";
import { createTypstCompiler, createWorkerHost } from "typst-wasm/node";
import * as engine from "@typst-wasm/engine-wasm/jspi";

const compiler = await createTypstCompiler({
  backend: "auto",
  engine,
  worker: () =>
    createWorkerHost(new URL(import.meta.resolve("typst-wasm/worker/node"))),
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

Compile options include `main`, `format`, `inputs`, `pages`, `ppi`, and `pdfStandards`. Browser and server resource loading can be customized with `fetch`, `packageBaseUrl`, and `packageCache`. For JSPI, import JCO's generated `engine` module and let it use its runtime default core-WASM loader. Use optional `getCoreModule(name)` only when a runtime needs precompiled modules, such as Cloudflare Workers. Worker deployments provide `worker` as a `WorkerHost` factory created directly or with the runtime-specific `createWorkerHost(url)` helper.

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
