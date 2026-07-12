// eslint-disable-next-line  @typescript-eslint/triple-slash-reference
/// <reference path="./assets.d.ts" />
import core1 from "@typst-wasm/engine-wasm/jspi/engine.core.wasm?module";
import core2 from "@typst-wasm/engine-wasm/jspi/engine.core2.wasm?module";
import core3 from "@typst-wasm/engine-wasm/jspi/engine.core3.wasm?module";
import regular from "@typst-wasm/fonts/NewCMMath-Regular.otf";
import bold from "@typst-wasm/fonts/NewCMMath-Bold.otf";
import book from "@typst-wasm/fonts/NewCMMath-Book.otf";
import { canonicalCases, runSuite } from "../../spec/suite.ts";
import { makeWorkerdContext } from "../../contexts/workerd.ts";

const dataModule = (value: unknown): ArrayBuffer => {
  if (!(value instanceof ArrayBuffer)) {
    throw new TypeError("Expected a Cloudflare Data module");
  }
  return value;
};

export default {
  fetch: async () => {
    try {
      const results = await runSuite(
        await makeWorkerdContext({
          coreModules: {
            "engine.core.wasm": core1,
            "engine.core2.wasm": core2,
            "engine.core3.wasm": core3,
          },
          fonts: [regular, bold, book].map(
            (font) => new Uint8Array(dataModule(font)),
          ),
        }),
        canonicalCases,
      );
      return Response.json({ cell: "workerd:jspi", results });
    } catch (error) {
      return Response.json(
        {
          error:
            error instanceof Error
              ? { name: error.name, message: error.message, stack: error.stack }
              : String(error),
        },
        { status: 500 },
      );
    }
  },
};
