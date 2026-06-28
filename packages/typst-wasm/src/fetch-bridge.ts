import { FetchError } from "./errors";
import { SharedMemoryCommunication, SharedMemoryCommunicationStatus } from "./protocol";

type PackageFileLoader = {
  getFile(spec: string): Promise<Uint8Array>;
};

export type FetchBridge = {
  readonly sharedMemoryCommunication: SharedMemoryCommunication;
  readonly handleFetchRequest: (path: string) => Promise<void>;
};

export const makeFetchBridge = (
  packageLoader: PackageFileLoader,
  isDisposed: () => boolean,
  fetchImpl: typeof fetch = fetch,
): FetchBridge => {
  const sharedMemoryCommunication = new SharedMemoryCommunication();

  const handleFetchRequest = async (path: string): Promise<void> => {
    if (isDisposed()) return;

    try {
      const bytes = path.startsWith("@") ? await packageLoader.getFile(path) : await fetchPath(path, fetchImpl);
      if (isDisposed()) return;

      sharedMemoryCommunication.setBuffer(bytes);
      sharedMemoryCommunication.setStatus(SharedMemoryCommunicationStatus.Success);
    } catch {
      if (!isDisposed()) {
        sharedMemoryCommunication.setStatus(SharedMemoryCommunicationStatus.Error);
      }
    }
  };

  return {
    sharedMemoryCommunication,
    handleFetchRequest,
  };
};

const fetchPath = async (path: string, fetchImpl: typeof fetch): Promise<Uint8Array> => {
  try {
    const response = await fetchImpl(path);
    if (!response.ok) throw new Error(`Status ${response.status}`);
    return new Uint8Array(await response.arrayBuffer());
  } catch (cause) {
    throw new FetchError(path, cause);
  }
};
