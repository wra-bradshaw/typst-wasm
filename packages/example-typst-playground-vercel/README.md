# typst-playground-vercel

TanStack Start SSR example for `typst-wasm`, suitable for Vercel.

The first preview is compiled on the server with `typst-wasm/node`.
After hydration, editor changes compile in the browser with `typst-wasm/browser`.
Vite handles the wasm, font, and worker assets; Nitro emits the Vercel Build
Output API artifact.

```sh
nix develop -c pnpm --filter @typst-wasm/example-typst-playground-vercel dev
```

Build the Vercel artifact:

```sh
nix develop -c pnpm --filter @typst-wasm/example-typst-playground-vercel build
```
