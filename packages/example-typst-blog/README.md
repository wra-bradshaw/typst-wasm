# typst-blog

React + Vite example for `@typst-wasm/vite-plugin-typst`.

The posts in `src/posts` are Typst files imported as compiled HTML modules at
build time.

```sh
nix develop -c pnpm --filter @typst-wasm/example-typst-blog dev
nix develop -c pnpm --filter @typst-wasm/example-typst-blog build
```

The build output is a static Vite `dist` directory. The included
`wrangler.jsonc` deploys it as Cloudflare Workers Static Assets with
`wrangler deploy`.
