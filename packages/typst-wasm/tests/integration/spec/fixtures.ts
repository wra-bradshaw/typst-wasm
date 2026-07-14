import { makeMemoryCacheStorage, type PackageCache } from "typst-wasm/files";

const packageArchive =
  "H4sIAAAAAAAAE+3TwYrCMBAGYM99ilIv68GStKk9efcdxEO1WSmmmZKOSt/eRAQ9CILQdcH/u0yYEDIh/Dx0PadMrZmMRniLhQpVloV4rFdSlBNZZJlSeS6VXwuZ5eHceCPdHXuunB/lL+76h9ZdtTtUe72JbNXqeBknZ3I1tZq1S6KTdn1DNrRFKtMiibRlN3TUWA5N02xTHrok+vQz4E23Hxz1jlf5F379mP8yV+p6btSpbr48/1OjOQ6Rn+/oaHlOvz9bqoeZT/d6pY2hsGnqzafnBAAAAAAAAAAAAAAAAAAAAIDnLnw2bcoAKAAA";

export const fontFilenames = [
  "NewCMMath-Regular.otf",
  "NewCMMath-Bold.otf",
  "NewCMMath-Book.otf",
] as const;

export const importSource = `#import "@preview/wordometer:0.1.5": word-count-of
#set page(width: auto, height: auto, margin: 10pt)
= Word Count Demo
#word-count-of[Hello world, this is a test.]`;

export const archiveBytes = (): Uint8Array =>
  Uint8Array.from(atob(packageArchive), (character) => character.charCodeAt(0));

export const makePackageFetch = (): {
  fetch: typeof fetch;
  requests: () => number;
  packageCache: PackageCache;
} => {
  let requestCount = 0;
  const packageCache = makeMemoryCacheStorage();
  return {
    fetch: (async (_) => {
      requestCount++;
      return new Response(new Blob([archiveBytes().buffer as ArrayBuffer]), {
        headers: { "content-type": "application/gzip" },
      });
    }) as typeof fetch,
    requests: () => requestCount,
    packageCache,
  };
};
