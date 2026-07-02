import type { TypstRuntime } from "../backends/index";
import { normalizeAssetUrl } from "../wasm/index";
import BrowserTypstWorker from "../worker/browser.ts?worker";
import { loadWasmModule } from "./browser-loader";

const inferGlueUrl = (wasmURL: string | undefined): string | undefined =>
  wasmURL?.replace(/\.wasm(?:$|[?#])/, (match) =>
    match.startsWith(".wasm") ? match.replace(".wasm", ".js") : match,
  );

export { loadWasmModule };

export const browserRuntime: TypstRuntime = {
  createWorker: () => new BrowserTypstWorker() as Worker,
  loadWasmModule,
  resolveAssets: (options) => {
    const wasmURL = normalizeAssetUrl(options.wasmURL);
    const glueURL = normalizeAssetUrl(options.glueURL);

    return {
      wasmURL,
      glueURL: glueURL ?? inferGlueUrl(wasmURL),
    };
  },
};
