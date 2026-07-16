# typst-playground-cloudflare

TanStack Start + Cloudflare Workers SSR example for `typst-wasm`.

The first preview is compiled in a TanStack Start route loader on Cloudflare
Workers with `typst-wasm/workerd`. After hydration, editor changes compile in
the browser with `typst-wasm/browser`.

The server compiler imports JCO's generated core WASM modules directly and
passes them through `coreModules`. Cloudflare's Vite plugin handles those
standard `.wasm` imports without any typst-wasm-specific Vite plugin.

```sh
nix develop -c pnpm --filter @typst-wasm/example-typst-playground-cloudflare dev
```

Build and preview using the Cloudflare Vite plugin:

```sh
nix develop -c pnpm --filter @typst-wasm/example-typst-playground-cloudflare build
nix develop -c pnpm --filter @typst-wasm/example-typst-playground-cloudflare preview
```
