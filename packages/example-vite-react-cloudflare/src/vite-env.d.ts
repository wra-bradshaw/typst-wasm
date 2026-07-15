/// <reference types="vite/client" />

declare module "typst-wasm/worker/web-worker?url" {
  const url: string;
  export default url;
}

declare module "@typst-wasm/fonts/*.otf?url" {
  const url: string;
  export default url;
}
