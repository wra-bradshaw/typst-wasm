import type { FileLoaderManager } from "../files/loaders";
import {
  SharedMemoryCommunication,
  SharedMemoryCommunicationStatus,
} from "./protocol";

export type FetchBridge = {
  readonly sharedMemoryCommunication: SharedMemoryCommunication;
  readonly handleFetchRequest: (path: string) => Promise<void>;
};

export const makeFetchBridge = (
  fileLoaderManager: FileLoaderManager,
  isDisposed: () => boolean,
): FetchBridge => {
  const sharedMemoryCommunication = new SharedMemoryCommunication();

  const handleFetchRequest = async (path: string): Promise<void> => {
    if (isDisposed()) return;

    try {
      const bytes = await fileLoaderManager.load(path);
      if (isDisposed()) return;

      sharedMemoryCommunication.setBuffer(bytes);
      sharedMemoryCommunication.setStatus(
        SharedMemoryCommunicationStatus.Success,
      );
    } catch {
      if (!isDisposed()) {
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
