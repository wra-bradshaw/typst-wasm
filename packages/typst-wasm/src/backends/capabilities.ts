import { getJspiWebAssembly } from "../wasm/jspi";

export const supportsWorkerBackend = (): boolean => {
  if (
    typeof SharedArrayBuffer === "undefined" ||
    typeof Atomics === "undefined" ||
    typeof Atomics.wait !== "function"
  ) {
    return false;
  }

  try {
    const buffer = new SharedArrayBuffer(0, { maxByteLength: 1 });
    return buffer.growable === true && typeof buffer.grow === "function";
  } catch {
    return false;
  }
};

export const supportsJspiBackend = (): boolean => {
  const wasm = getJspiWebAssembly();
  return (
    typeof wasm.Suspending === "function" &&
    typeof wasm.promising === "function"
  );
};
