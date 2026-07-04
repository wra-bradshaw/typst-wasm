# typst-playground-next

Next.js App Router SSR example for `typst-wasm`, suitable for Vercel.

The first preview is compiled in a server component with `typst-wasm/node`.
After hydration, editor changes compile in the browser with `typst-wasm/browser`.

```sh
nix develop -c pnpm --filter @typst-wasm/example-typst-playground-next dev
```

Build the Next app:

```sh
nix develop -c pnpm --filter @typst-wasm/example-typst-playground-next build
```
