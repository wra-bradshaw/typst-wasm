import { FontLoadError } from "./errors";
import type { RuntimeAsset, TypstCompiler } from "./compiler/types";

export const loadFonts = async (
  compiler: Pick<TypstCompiler, "addFont">,
  fonts: RuntimeAsset<Uint8Array>[],
): Promise<void> => {
  for (const [index, font] of fonts.entries()) {
    try {
      const data =
        typeof font === "function"
          ? await (font as () => Uint8Array | Promise<Uint8Array>)()
          : font;
      await compiler.addFont(data);
    } catch (cause) {
      throw new FontLoadError(`font-${index}`, cause);
    }
  }
};
