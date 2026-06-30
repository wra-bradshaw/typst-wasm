export type HostFetch = (
  pathPtr: number,
  pathLen: number,
  resultLenPtr: number,
) => number;

const hostFetchers = new Map<number, HostFetch>();

export const registerHostFetch = (hostId: number, hostFetch: HostFetch): void => {
  hostFetchers.set(hostId, hostFetch);
};

export const unregisterHostFetch = (hostId: number): void => {
  hostFetchers.delete(hostId);
};

export const host_fetch = (
  hostId: number,
  pathPtr: number,
  pathLen: number,
  resultLenPtr: number,
): number => {
  const hostFetch = hostFetchers.get(hostId);
  if (!hostFetch) {
    throw new Error(`No host_fetch registered for host id ${hostId}`);
  }

  return hostFetch(pathPtr, pathLen, resultLenPtr);
};
