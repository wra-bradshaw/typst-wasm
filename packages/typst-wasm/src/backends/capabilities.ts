import { getJspiWebAssembly } from "../wasm/jspi";

export const supportsWorkerBackend = (): boolean =>
  typeof SharedArrayBuffer !== "undefined" &&
  typeof Atomics !== "undefined" &&
  typeof Atomics.wait === "function";

export const supportsJspiBackend = (): boolean => {
  const wasm = getJspiWebAssembly();
  return (
    typeof wasm.Suspending === "function" &&
    typeof wasm.promising === "function"
  );
};
