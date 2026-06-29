# typst-wasm

`typst-wasm` is the primary npm package. The WASM engine and bundled default fonts are published as scoped runtime dependencies for users who want to import those assets directly.

## Usage

```ts
import { createTypstCompiler, defaultFonts } from "typst-wasm";
import wasmUrl from "typst-wasm/wasm";

const compiler = await createTypstCompiler({
  moduleOrPath: wasmUrl,
  backend: "auto",
});

try {
  for (const font of defaultFonts) {
    await compiler.addFont(await font.load());
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

Compile options include `main`, `format`, `inputs`, `features`, `pages`, `ppi`, `pdfStandards`, `pdfTags`, `creationTimestamp`, `deps`, and `timings`. Browser and server resource loading can be customized with `fetch`, `packageBaseUrl`, and `packageCache` on `createTypstCompiler`.

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

Use the Nix shell for reproducible artifact builds. Outside Nix, install pnpm 11 plus Bun and Deno for runtime e2e checks.

## Commands

```bash
pnpm build
pnpm test
pnpm e2e
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
