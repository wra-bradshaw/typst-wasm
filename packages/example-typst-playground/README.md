# typst-playground

React + TanStack Start + Nitro example for `typst-wasm`.

The first preview is compiled in the route loader on the server. After
hydration, editor changes compile in the browser with the same public
`typst-wasm` API.

```sh
nix develop -c pnpm --filter @typst-wasm/example-playground dev
```

Deployment builds:

```sh
nix develop -c pnpm --filter @typst-wasm/example-playground build:cloudflare
nix develop -c pnpm --filter @typst-wasm/example-playground build:vercel
```

Both scripts build the same TanStack Start SSR app. Use the generated `dist`
and `.output` output with the Cloudflare or Vercel deployment flow configured
for your project. The scripts select `NITRO_PRESET=cloudflare-module` and
`NITRO_PRESET=vercel` respectively.
