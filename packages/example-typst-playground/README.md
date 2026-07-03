# typst-playground

React + TanStack Start + Nitro example for `typst-wasm`.

The first preview is compiled in the route loader on the server. After
hydration, editor changes compile in the browser with the same public
`typst-wasm` API.

```sh
nix develop -c pnpm --filter @typst-wasm/example-typst-playground dev
```

Deployment builds:

```sh
nix develop -c pnpm --filter @typst-wasm/example-typst-playground build:cloudflare
nix develop -c pnpm --filter @typst-wasm/example-typst-playground build:vercel
```

Both scripts build the same TanStack Start SSR app. Use the generated
`.output` output for Cloudflare Workers and `.vercel/output` output for
Vercel. The scripts select `NITRO_PRESET=cloudflare_module` and
`NITRO_PRESET=vercel` respectively.
