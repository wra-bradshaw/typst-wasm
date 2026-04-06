# typst-wasm

`typst-wasm` is published as a single npm package and developed in a workspace with separate internal packages for the TypeScript runtime and Rust/WASM engine.

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
