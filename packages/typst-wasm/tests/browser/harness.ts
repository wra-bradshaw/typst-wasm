import {
  createTypstCompiler,
  createWorkerHost,
  type TypstCompiler,
} from "typst-wasm";
import browserWorkerUrl from "typst-wasm/worker/browser?worker&url";
import coreUrl from "@typst-wasm/engine-wasm/worker/engine.core.wasm?url";
import core2Url from "@typst-wasm/engine-wasm/worker/engine.core2.wasm?url";
import core3Url from "@typst-wasm/engine-wasm/worker/engine.core3.wasm?url";
import mathBoldUrl from "@typst-wasm/fonts/NewCMMath-Bold.otf?url";
import mathBookUrl from "@typst-wasm/fonts/NewCMMath-Book.otf?url";
import mathRegularUrl from "@typst-wasm/fonts/NewCMMath-Regular.otf?url";

const coreUrls: Record<string, string> = {
  "engine.core.wasm": coreUrl,
  "engine.core2.wasm": core2Url,
  "engine.core3.wasm": core3Url,
};

const fetchBytes = async (url: string): Promise<Uint8Array> => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch browser asset: ${url}`);
  return new Uint8Array(await response.arrayBuffer());
};

const loadCoreModule = async (name: string): Promise<WebAssembly.Module> =>
  WebAssembly.compile(await fetchBytes(coreUrls[name] ?? ""));

const addFonts = async (compiler: TypstCompiler): Promise<void> => {
  for (const url of [mathRegularUrl, mathBoldUrl, mathBookUrl]) {
    await compiler.addFont(await fetchBytes(url));
  }
};

export type BrowserCompilerOptions = {
  backend?: "auto" | "worker";
};

const createBrowserCompilerInstance = async (
  options: BrowserCompilerOptions = {},
): Promise<TypstCompiler> => {
  const compiler = await createTypstCompiler({
    backend: options.backend ?? "auto",
    getCoreModule: loadCoreModule,
    worker: () => createWorkerHost(browserWorkerUrl),
  });
  try {
    await addFonts(compiler);
    return compiler;
  } catch (error) {
    await compiler.dispose();
    throw error;
  }
};

export const createBrowserCompiler = async <T>(
  options: BrowserCompilerOptions,
  callback: (compiler: TypstCompiler) => Promise<T>,
): Promise<T> => {
  const compiler = await createBrowserCompilerInstance(options);
  try {
    return await callback(compiler);
  } finally {
    await compiler.dispose();
  }
};
