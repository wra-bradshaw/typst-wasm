import { useEffect, useRef } from "react";

const useAbortableCallback = <Args extends unknown[]>(
  callback: (signal: AbortSignal, ...args: Args) => Promise<void>,
) => {
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(
    () => () => {
      controllerRef.current?.abort();
    },
    [],
  );

  const run = (...args: Args): void => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    void callback(controller.signal, ...args).finally(() => {
      if (controllerRef.current === controller) {
        controllerRef.current = null;
      }
    });
  };

  return { run };
};

export default useAbortableCallback;
