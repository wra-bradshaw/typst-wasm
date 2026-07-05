# @typst-wasm/fonts

## 1.0.0

### Major Changes

- [`f82e2e4`](https://github.com/wra-bradshaw/typst-wasm/commit/f82e2e4f100a301ce65252b7b0c67546cb22ef98) Thanks [@wra-bradshaw](https://github.com/wra-bradshaw)! - Make `@typst-wasm/fonts` a file-only package.

  The fonts package no longer exports JavaScript descriptors or `loadDefaultFonts`; it only exposes the bundled `.otf` files as explicit package subpaths. `typst-wasm` no longer re-exports the fonts package, and the Vite plugin no longer loads bundled fonts implicitly. Applications should import or resolve the font files they need and add them with `compiler.addFont(...)`.

### Minor Changes

- [`e606dc9`](https://github.com/wra-bradshaw/typst-wasm/commit/e606dc944050090dc13b8f0cfc79f65ce62e198d) Thanks [@wra-bradshaw](https://github.com/wra-bradshaw)! - add examples, change instantiation APIs to be more flexible, improve performance

## 0.3.0

### Minor Changes

- [`3b0d5c7`](https://github.com/wra-bradshaw/typst-wasm/commit/3b0d5c77b0e2c767f602672735d06de0b7eaaf5a) Thanks [@wra-bradshaw](https://github.com/wra-bradshaw)! - wasm optimisations and improved testing

- [`7cc01af`](https://github.com/wra-bradshaw/typst-wasm/commit/7cc01af53793636f654e1ead8d933321656c3882) Thanks [@wra-bradshaw](https://github.com/wra-bradshaw)! - fix tests and make vite-plugin-typst reuse its compiler

## 0.2.0

### Minor Changes

- [`3d7a6f1`](https://github.com/wra-bradshaw/typst-wasm/commit/3d7a6f1370760bfa66ba26e532a01201fa8d00f0) Thanks [@wra-bradshaw](https://github.com/wra-bradshaw)! - Make wasm module loading runtime indepdent

## 0.1.1

## 0.1.0

### Minor Changes

- [`d274ffd`](https://github.com/wra-bradshaw/typst-wasm/commit/d274ffdaf96844fdda0e9b12f3317bf040201c96) Thanks [@wra-bradshaw](https://github.com/wra-bradshaw)! - make code improvements and simplifications

## 0.0.2

### Patch Changes

- [`c18b724`](https://github.com/wra-bradshaw/typst-wasm/commit/c18b72463e5948f5cbfb2b51006cb4d7f5ca13c8) Thanks [@wra-bradshaw](https://github.com/wra-bradshaw)! - fix building
