import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FileLoaderManager } from "./file-loader";
import type { TypstFileLoader } from "./types";
import {
  installJspiWebAssemblyMock,
  makeFakeDirectServiceHost,
} from "../tests/unit/fakes";

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

  it("keeps concurrent JSPI compiler instances on separate host fetchers", async () => {
    const { DirectService } = await import("./direct-service");
    const first = new DirectService(
      new FileLoaderManager([makeLoader(1)]),
      host.internals,
    );
    const second = new DirectService(
      new FileLoaderManager([makeLoader(2)]),
      host.internals,
    );

    await Promise.all([
      first.init({ wasmURL: "ignored.wasm", glueURL: "ignored.js" }),
      second.init({ wasmURL: "ignored.wasm", glueURL: "ignored.js" }),
    ]);

    const [firstResult, secondResult] = await Promise.all([
      first.compile({
        format: "pdf",
        main: null,
        inputs: null,
        pages: null,
        pdf_standards: null,
        ppi: null,
      }),
      second.compile({
        format: "pdf",
        main: null,
        inputs: null,
        pages: null,
        pdf_standards: null,
        ppi: null,
      }),
    ]);

    expect([...firstResult.output_bytes!]).toEqual([1]);
    expect([...secondResult.output_bytes!]).toEqual([2]);
    expect(host.hostFetchCount()).toBe(2);

    await first.dispose();
    await second.dispose();

    expect(host.hostFetchCount()).toBe(0);
  });

  it("surfaces init failures and allows a later retry", async () => {
    const { DirectService } = await import("./direct-service");
    const service = new DirectService(
      new FileLoaderManager([makeLoader(1)]),
      host.internals,
    );

    await expect(
      service.init({ wasmURL: "bad.wasm", glueURL: "bad.js" }),
    ).rejects.toThrow("failed to load wasm");
    await expect(
      service.init({ wasmURL: "good.wasm", glueURL: "good.js" }),
    ).resolves.toBeUndefined();

    await service.dispose();
  });
});
