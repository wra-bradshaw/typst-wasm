import type { TypstCompiler } from "typst-wasm";
import { assertSvgPage, type IntegrationScenarioOptions } from "./harness.ts";

const importSource = `#import "@preview/wordometer:0.1.5": word-count-of
#set page(width: auto, height: auto, margin: 10pt)
= Word Count Demo
#word-count-of[Hello world, this is a test.]
`;

// Small deterministic package archive used instead of relying on the public registry.
const packageArchive =
  "H4sIAAAAAAAAE+3TwYrCMBAGYM99ilIv68GStKk9efcdxEO1WSmmmZKOSt/eRAQ9CILQdcH/u0yYEDIh/Dx0PadMrZmMRniLhQpVloV4rFdSlBNZZJlSeS6VXwuZ5eHceCPdHXuunB/lL+76h9ZdtTtUe72JbNXqeBknZ3I1tZq1S6KTdn1DNrRFKtMiibRlN3TUWA5N02xTHrok+vQz4E23Hxz1jlf5F379mP8yV+p6btSpbr48/1OjOQ6Rn+/oaHlOvz9bqoeZT/d6pY2hsGnqzafnBAAAAAAAAAAAAAAAAAAAAIDnLnw2bcoAKAAA";

const archiveBytes = (): Uint8Array =>
  Uint8Array.from(atob(packageArchive), (character) => character.charCodeAt(0));

export const makePackageFetch = (): {
  fetch: typeof fetch;
  requests: () => number;
} => {
  let requestCount = 0;
  return {
    fetch: async (input) => {
      requestCount++;
      assert(
        String(input).endsWith("/preview/wordometer-0.1.5.tar.gz"),
        `unexpected package URL ${String(input)}`,
      );
      return new Response(archiveBytes(), {
        headers: { "content-type": "application/gzip" },
      });
    },
    requests: () => requestCount,
  };
};

export const runImportScenario = async (
  compiler: TypstCompiler,
  options: IntegrationScenarioOptions,
): Promise<void> => {
  await compiler.clearFiles();
  await compiler.addSource("main.typ", importSource);

  const result = await compiler.compile({
    main: "main.typ",
    format: "svg",
  });

  assertSvgPage(result, options.runtime, "package import compile");
};

export const runDeterministicPackageScenario = async (
  compiler: TypstCompiler,
  options: IntegrationScenarioOptions,
): Promise<void> => {
  await compiler.clearFiles();
  await compiler.addSource("deterministic.typ", importSource);
  const result = await compiler.compile({
    main: "deterministic.typ",
    format: "svg",
  });
  assertSvgPage(result, options.runtime, "deterministic package import");
  // PackageManager deduplicates repeated package requests in one compiler.
  await compiler.compile({ main: "deterministic.typ", format: "svg" });
  if (options.packageRequests) {
    assert(
      options.packageRequests() === 1,
      `[${options.runtime}] expected a package cache hit on the second compile`,
    );
  }
};
