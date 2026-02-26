# typst-wasm

`typst-wasm` is a standalone TypeScript + Rust package that exposes Typst compilation through a WASM backend with worker and JSPI integration.

## Requirements

- [Bun](https://bun.sh)
- Rust toolchain with `wasm32-unknown-unknown`
- [`wasm-pack`](https://rustwasm.github.io/wasm-pack/)
- Optional: [Nix](https://nixos.org) + [direnv](https://direnv.net)

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

Install Bun, Rust (`wasm32-unknown-unknown` target), and `wasm-pack` manually.

## Commands

```bash
bun install
bun run lint
bun run test
bun run build
```

Optional full runtime coverage:

```bash
bun run test:all
```

## Release

Publishing is handled by GitHub Actions on pushed tags matching `v*`.

```bash
git tag vX.Y.Z
git push --tags
```

The release workflow builds and publishes to npm with provenance (`npm publish --provenance --access public`).
