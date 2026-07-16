type JspiHostFetch = (
  pathPtr: number,
  pathLen: number,
  resultLenPtr: number,
) => Promise<number>;

type JspiCompileThunk<TOptions> = (
  compilerPtr: number,
  options: TOptions,
) => [number, number, number];

export type JspiWebAssembly<TOptions = unknown> = typeof WebAssembly & {
  Suspending?: new (
    fn: JspiHostFetch,
  ) => (pathPtr: number, pathLen: number, resultLenPtr: number) => number;
  promising?: (
    fn: JspiCompileThunk<TOptions>,
  ) => (
    compilerPtr: number,
    options: TOptions,
  ) => Promise<[number, number, number]>;
};

export const getJspiWebAssembly = <
  TOptions = unknown,
>(): JspiWebAssembly<TOptions> => WebAssembly as JspiWebAssembly<TOptions>;
