/**
 * Host-side worker channel.
 */
export interface WorkerHost {
  /** Subscribes to worker messages and errors. */
  listen(
    onMessage: (data: unknown) => void,
    onError: (cause: unknown) => void,
  ): void;
  /** Sends a protocol message to the worker. */
  postMessage(data: unknown): void;
  /** Stops the worker and releases its resources. */
  terminate(): void | Promise<unknown>;
}
