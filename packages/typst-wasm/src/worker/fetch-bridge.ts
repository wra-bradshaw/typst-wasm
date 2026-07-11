import type { FileLoaderManager } from "../files/loaders";
import { FileNotFoundError, FetchError, PackageFetchError } from "../errors";
import type { EngineFetchRequest } from "../engine/types";
import type { ResolvedLogger } from "../logging";
import {
  SharedMemoryCommunication,
  SharedMemoryCommunicationError,
  SharedMemoryCommunicationStatus,
} from "./protocol";

export type FetchBridge = {
  readonly sharedMemoryCommunication: SharedMemoryCommunication;
  readonly handleFetchRequest: (request: EngineFetchRequest) => Promise<void>;
};

export const makeFetchBridge = (
  fileLoaderManager: FileLoaderManager,
  isDisposed: () => boolean,
  logger?: ResolvedLogger,
): FetchBridge => {
  const sharedMemoryCommunication = new SharedMemoryCommunication();

  const handleFetchRequest = async (
    request: EngineFetchRequest,
  ): Promise<void> => {
    if (isDisposed()) return;

    try {
      const loaded = await fileLoaderManager.loadFile(request);
      if (isDisposed()) return;

      sharedMemoryCommunication.setBuffer(loaded.data);
      sharedMemoryCommunication.setError(SharedMemoryCommunicationError.Other);
      sharedMemoryCommunication.setStatus(
        SharedMemoryCommunicationStatus.Success,
      );
    } catch (error) {
      // The engine only receives a shared-memory error code. Keep the original
      // loader error visible in the host console instead of reducing it to the
      // generic "failed to load file" diagnostic.
      logger?.error("Typst file load failed", {
        path: request.path,
        cause: error,
      });
      if (!isDisposed()) {
        const code =
          error instanceof FileNotFoundError
            ? SharedMemoryCommunicationError.NotFound
            : error instanceof FetchError || error instanceof PackageFetchError
              ? SharedMemoryCommunicationError.Other
              : SharedMemoryCommunicationError.Other;
        sharedMemoryCommunication.setError(code);
        sharedMemoryCommunication.setStatus(
          SharedMemoryCommunicationStatus.Error,
        );
      }
    }
  };

  return {
    sharedMemoryCommunication,
    handleFetchRequest,
  };
};
