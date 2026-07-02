# typst-blog

React + Vite example for `@typst-wasm/vite-plugin-typst`.

The posts in `src/posts` are Typst files imported as compiled HTML modules at
build time.

```sh
nix develop -c pnpm --filter @typst-wasm/example-blog dev
nix develop -c pnpm --filter @typst-wasm/example-blog build
```
