import { describe, expect, it, vi } from "vitest";
import { loadFonts } from "./fonts";

describe("loadFonts", () => {
  it("loads byte assets and lazy assets in order", async () => {
    const addFont = vi.fn(async () => undefined);
    await loadFonts({ addFont }, [
      new Uint8Array([1]),
      async () => new Uint8Array([2]),
    ]);
    expect(addFont).toHaveBeenNthCalledWith(1, new Uint8Array([1]));
    expect(addFont).toHaveBeenNthCalledWith(2, new Uint8Array([2]));
  });
});
