/**
 * Worker-internal message channel.
 */
export interface WorkerPort {
  onMessage(handler: (data: unknown) => void): void;
  postMessage(data: unknown): void;
}
