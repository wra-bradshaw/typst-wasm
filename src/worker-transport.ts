import { Effect, Queue } from "effect";
import { isWorkerToMainMessage, type WorkerToMainMessage } from "./messages";

type WorkerLike = {
  onmessage: ((event: MessageEvent) => void) | null;
  postMessage: (message: unknown) => void;
};

export type WorkerTransport = {
  readonly incoming: Queue.Dequeue<WorkerToMainMessage>;
  readonly post: (message: unknown) => void;
};

export const makeWorkerTransport = (worker: WorkerLike): Effect.Effect<WorkerTransport> =>
  Effect.gen(function* () {
    const incoming = yield* Queue.bounded<WorkerToMainMessage>(64);

    yield* Effect.sync(() => {
      worker.onmessage = (event: MessageEvent) => {
        if (!isWorkerToMainMessage(event.data)) {
          return;
        }
        Effect.runFork(Queue.offer(incoming, event.data));
      };
    });

    return {
      incoming,
      post: (message: unknown) => {
        worker.postMessage(message);
      },
    };
  });
