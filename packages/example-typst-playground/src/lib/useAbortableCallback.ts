import { useCallback, useRef } from "react";

type AbortableCallback<Args extends unknown[]> = (
  signal: AbortSignal,
  ...args: Args
) => void | Promise<void>;

function useAbortableCallback<Args extends unknown[]>(
  callback: AbortableCallback<Args>,
) {
  const controllerRef = useRef<AbortController | null>(null);
  const callIdRef = useRef(0);

  const abort = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    callIdRef.current += 1;
  }, []);

  const run = useCallback(async (...args: Args) => {
    controllerRef.current?.abort();

    const controller = new AbortController();
    controllerRef.current = controller;

    const callId = ++callIdRef.current;

    try {
      await callback(controller.signal, ...args);
    } catch (err) {
      if (!controller.signal.aborted) {
        throw err;
      }
    } finally {
      if (controllerRef.current === controller && callId == callIdRef.current) {
        controllerRef.current = null;
      }
    }
  }, []);

  return { run, abort };
}

export { useAbortableCallback };
export default useAbortableCallback;
