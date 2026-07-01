import { describe, expect, test } from "vitest";
import typst from ".";

describe("vite-plugin-typst", () => {
  test("exposes a Vite plugin", () => {
    const plugin = typst();
    expect(plugin.name).toBe("vite-plugin-typst");
    expect(plugin.transform).toBeDefined();
  });
});
