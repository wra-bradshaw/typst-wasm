import {
  createTypstCompiler,
  createNodeWorkerHost,
  type CompileResult,
  type TypstCompiler,
  type EngineModule,
  type WorkerHost,
} from "typst-wasm";

export type RuntimeName = "bun" | "node" | "deno";

export type IntegrationScenarioOptions = {
  runtime: RuntimeName;
  engine?: EngineModule;
  fontData?: Uint8Array[];
  backend?: "auto" | "worker" | "jspi";
  fetch?: typeof fetch;
  packageBaseUrl?: string;
  packageRequests?: () => number;
  packageCache?: Parameters<typeof createTypstCompiler>[0]["packageCache"];
};

export const assert: (
  condition: unknown,
  message: string,
) => asserts condition = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

export const assertRejects = async (
  promise: Promise<unknown>,
  predicate: (error: unknown) => boolean,
  message: string,
): Promise<void> => {
  try {
    await promise;
  } catch (error) {
    assert(predicate(error), message);
    return;
  }

  throw new Error(message);
};

export const textBytes = (text: string): Uint8Array =>
  new TextEncoder().encode(text);

export const fontFilenames = [
  "NewCMMath-Regular.otf",
  "NewCMMath-Bold.otf",
  "NewCMMath-Book.otf",
];

export const assertIncludes = (
  values: string[],
  expected: string,
  runtime: RuntimeName,
): void => {
  assert(
    values.includes(expected),
    `[${runtime}] expected listFiles to include ${expected}; got ${values.join(", ")}`,
  );
};

export const assertSvgPage = (
  result: CompileResult,
  runtime: RuntimeName,
  label: string,
  expectedText?: string,
): number => {
  assert(
    result.format === "svg" && result.pages.length > 0,
    `[${runtime}] expected ${label} to return SVG pages`,
  );
  const page = result.pages[0];
  const output = page?.output ?? "";
  assert(output.length > 0, `[${runtime}] expected ${label} SVG output`);
  assert(
    output.includes("<svg") && output.includes("xmlns"),
    `[${runtime}] expected ${label} to contain an SVG root`,
  );
  if (expectedText) {
    assert(
      output.includes(expectedText),
      `[${runtime}] expected ${label} SVG to contain ${JSON.stringify(expectedText)}`,
    );
  }
  return output.length;
};

const addDefaultFonts = async (
  compiler: TypstCompiler,
  fontData?: Uint8Array[],
): Promise<void> => {
  if (fontData) {
    for (const data of fontData) {
      await compiler.addFont(data);
    }
    return;
  }

  for (const filename of fontFilenames) {
    const response = await fetch(
      new URL(import.meta.resolve(`@typst-wasm/fonts/${filename}`)),
    );
    await compiler.addFont(new Uint8Array(await response.arrayBuffer()));
  }
};

const createDenoWorkerHost = (workerUrl: string | URL): WorkerHost => {
  const worker = new Worker(workerUrl, { type: "module" });
  return {
    listen: (onMessage, onError) => {
      worker.onmessage = (event) => onMessage(event.data);
      worker.onerror = (event) => onError(event.error ?? event.message);
    },
    postMessage: (data) => worker.postMessage(data),
    terminate: () => worker.terminate(),
  };
};

export const makeCompiler = async (
  options: IntegrationScenarioOptions,
): Promise<TypstCompiler> => {
  const getCoreModule = async (name: string): Promise<WebAssembly.Module> => {
    const url = new URL(
      import.meta.resolve(`@typst-wasm/engine-wasm/worker/${name}`),
    );
    if (options.runtime !== "deno") {
      const { readFile } = await import("node:fs/promises");
      return WebAssembly.compile(await readFile(url));
    }

    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to load ${name}`);
    return WebAssembly.compile(await response.arrayBuffer());
  };

  const compiler = await createTypstCompiler({
    engine: options.engine,
    getCoreModule,
    ...(options.runtime !== "deno" && {
      worker: () =>
        createNodeWorkerHost(
          new URL(import.meta.resolve("typst-wasm/worker/node")),
        ),
    }),
    ...(options.runtime === "deno" && {
      worker: () =>
        createDenoWorkerHost(
          new URL(import.meta.resolve("typst-wasm/worker/browser")),
        ),
    }),
    backend: options.backend,
    fetch: options.fetch,
    packageBaseUrl: options.packageBaseUrl,
    packageCache: options.packageCache,
  });

  await addDefaultFonts(compiler, options.fontData);
  return compiler;
};
