import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FileLoaderManager } from "../files/loaders";
import type { TypstFileLoader } from "../compiler/types";
import {
  installJspiWebAssemblyMock,
  makeFakeDirectServiceHost,
} from "../../tests/unit/fakes";

vi.mock("@typst-wasm/engine-wasm/bridge", () => ({
  registerHostFetch: () => undefined,
  unregisterHostFetch: () => undefined,
}));

const makeLoader = (value: number): TypstFileLoader => ({
  load: async (request) =>
    request.path === "shared.typ" ? new Uint8Array([value]) : null,
});

describe("DirectService host fetch routing", () => {
  const host = makeFakeDirectServiceHost();
  let restoreWebAssembly: (() => void) | undefined;

  beforeEach(() => {
    host.reset();
    restoreWebAssembly = installJspiWebAssemblyMock();
  });

  afterEach(() => {
    restoreWebAssembly?.();
    restoreWebAssembly = undefined;
  });

  it("surfaces init failures and allows a later retry", async () => {
    const { DirectService } = await import("./direct");
    const service = new DirectService(
      new FileLoaderManager([makeLoader(1)]),
      host.internals,
    );

    await expect(service.init(new Uint8Array([0]))).rejects.toThrow(
      "failed to load wasm",
    );
    await expect(service.init(new Uint8Array([1]))).resolves.toBeUndefined();

    await service.dispose();
  });
});
