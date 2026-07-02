/**
 * Host-side worker channel.
 */
export interface WorkerHost {
  listen(
    onMessage: (data: unknown) => void,
    onError: (cause: unknown) => void,
  ): void;
  postMessage(data: unknown): void;
  terminate(): void | Promise<unknown>;
}
