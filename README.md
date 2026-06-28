# typst-wasm

`typst-wasm` is published as a single npm package and developed in a workspace with separate internal packages for the TypeScript runtime and Rust/WASM engine.

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

- [Nix](https://nixos.org) + optional [direnv](https://direnv.net)

## Local setup

### Option 1: Nix + direnv

```bash
direnv allow
```

or

```bash
nix develop
```

### Option 2: Manual toolchain setup

Install pnpm 10, Bun, Deno, and a Rust toolchain with `wasm32-unknown-unknown`.

## Commands

```bash
nix build .#typst-wasm
nix flake check
```

Package-specific shells are also available:

```bash
nix develop .#engine-wasm
nix develop .#typst-wasm
```

## Release

Publishing is handled by GitHub Actions on pushed tags matching `v*`.

```bash
git tag vX.Y.Z
git push --tags
```

The release workflow builds and publishes to npm with provenance (`npm publish --provenance --access public`).
