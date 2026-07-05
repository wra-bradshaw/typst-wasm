# @typst-wasm/vite-plugin-typst

## 1.0.0

### Major Changes

- [`d5698ef`](https://github.com/wra-bradshaw/typst-wasm/commit/d5698efac67cb9f674a473189ab8f3e091973cf3) Thanks [@wra-bradshaw](https://github.com/wra-bradshaw)! - Require callers to provide `assets.wasm` explicitly and remove the default packaged WASM resolver.

  The `typst-wasm/wasm` subpath and root `wasmBinaryUrl` export have been removed. This avoids eager Node asset resolution during SSR imports and makes WASM loading fully controlled by the consumer or bundler.

- [`f82e2e4`](https://github.com/wra-bradshaw/typst-wasm/commit/f82e2e4f100a301ce65252b7b0c67546cb22ef98) Thanks [@wra-bradshaw](https://github.com/wra-bradshaw)! - Make `@typst-wasm/fonts` a file-only package.

  The fonts package no longer exports JavaScript descriptors or `loadDefaultFonts`; it only exposes the bundled `.otf` files as explicit package subpaths. `typst-wasm` no longer re-exports the fonts package, and the Vite plugin no longer loads bundled fonts implicitly. Applications should import or resolve the font files they need and add them with `compiler.addFont(...)`.

### Minor Changes

- [`e606dc9`](https://github.com/wra-bradshaw/typst-wasm/commit/e606dc944050090dc13b8f0cfc79f65ce62e198d) Thanks [@wra-bradshaw](https://github.com/wra-bradshaw)! - add examples, change instantiation APIs to be more flexible, improve performance

### Patch Changes

- [`f82e2e4`](https://github.com/wra-bradshaw/typst-wasm/commit/f82e2e4f100a301ce65252b7b0c67546cb22ef98) Thanks [@wra-bradshaw](https://github.com/wra-bradshaw)! - Make runtime asset and worker configuration explicit.

  The Node runtime no longer auto-selects or auto-spawns worker threads. Runtime assets now use one `assets` object: `assets.wasm` is required, and `assets.worker` is a `WorkerHost` factory. Browser and Node entries expose `createWorkerHost(url)` helpers for turning explicit worker URLs into runtime-specific hosts. Workerd rejects worker backends with a clear configuration error. Added explicit `typst-wasm/browser`, `typst-wasm/node`, `typst-wasm/workerd`, and worker subpath exports for bundler-controlled setup.

- Updated dependencies [[`e606dc9`](https://github.com/wra-bradshaw/typst-wasm/commit/e606dc944050090dc13b8f0cfc79f65ce62e198d), [`f82e2e4`](https://github.com/wra-bradshaw/typst-wasm/commit/f82e2e4f100a301ce65252b7b0c67546cb22ef98), [`d5698ef`](https://github.com/wra-bradshaw/typst-wasm/commit/d5698efac67cb9f674a473189ab8f3e091973cf3), [`f82e2e4`](https://github.com/wra-bradshaw/typst-wasm/commit/f82e2e4f100a301ce65252b7b0c67546cb22ef98)]:
  - typst-wasm@1.0.0

## 0.3.0

### Minor Changes

- [`3b0d5c7`](https://github.com/wra-bradshaw/typst-wasm/commit/3b0d5c77b0e2c767f602672735d06de0b7eaaf5a) Thanks [@wra-bradshaw](https://github.com/wra-bradshaw)! - wasm optimisations and improved testing

- [`7cc01af`](https://github.com/wra-bradshaw/typst-wasm/commit/7cc01af53793636f654e1ead8d933321656c3882) Thanks [@wra-bradshaw](https://github.com/wra-bradshaw)! - fix tests and make vite-plugin-typst reuse its compiler

### Patch Changes

- Updated dependencies [[`3b0d5c7`](https://github.com/wra-bradshaw/typst-wasm/commit/3b0d5c77b0e2c767f602672735d06de0b7eaaf5a), [`7cc01af`](https://github.com/wra-bradshaw/typst-wasm/commit/7cc01af53793636f654e1ead8d933321656c3882)]:
  - typst-wasm@0.3.0

## 0.2.0

### Minor Changes

- [`3d7a6f1`](https://github.com/wra-bradshaw/typst-wasm/commit/3d7a6f1370760bfa66ba26e532a01201fa8d00f0) Thanks [@wra-bradshaw](https://github.com/wra-bradshaw)! - Make wasm module loading runtime indepdent

### Patch Changes

- Updated dependencies [[`3d7a6f1`](https://github.com/wra-bradshaw/typst-wasm/commit/3d7a6f1370760bfa66ba26e532a01201fa8d00f0)]:
  - typst-wasm@0.2.0

## 0.1.1

### Patch Changes

- Updated dependencies [[`edabec2`](https://github.com/wra-bradshaw/typst-wasm/commit/edabec246ac9f042a339c6e83b6b08694e52abdd)]:
  - typst-wasm@0.1.1

## 0.1.0

### Minor Changes

- [`d274ffd`](https://github.com/wra-bradshaw/typst-wasm/commit/d274ffdaf96844fdda0e9b12f3317bf040201c96) Thanks [@wra-bradshaw](https://github.com/wra-bradshaw)! - make code improvements and simplifications

### Patch Changes

- Updated dependencies [[`d274ffd`](https://github.com/wra-bradshaw/typst-wasm/commit/d274ffdaf96844fdda0e9b12f3317bf040201c96)]:
  - typst-wasm@0.1.0
