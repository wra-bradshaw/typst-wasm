# typst-wasm

`typst-wasm` is published as a single npm package and developed in a workspace with separate internal packages for the TypeScript runtime and Rust/WASM engine.

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
npm install
npm run lint
npm run test
npm run build
```

Optional full runtime coverage:

```bash
npm run test:all
```

## Release

Publishing is handled by GitHub Actions on pushed tags matching `v*`.

```bash
git tag vX.Y.Z
git push --tags
```

The release workflow builds and publishes to npm with provenance (`npm publish --provenance --access public`).
