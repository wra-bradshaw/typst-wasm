import { describe, expect, it } from "vitest";
import { FileLoaderManager } from "../files/loaders";
import type { TypstFileLoader } from "../compiler/types";
import type { EngineImports, EngineModule } from "../engine/types";

const loader: TypstFileLoader = async (request) =>
  request.path === "shared.typ"
    ? { data: new Uint8Array([7]), resolvedPath: "shared.typ" }
    : null;

describe("DirectService host fetch routing", () => {
  it("awaits the WIT host fetch and preserves request metadata", async () => {
    const requests: unknown[] = [];
    const engine = {
      instantiate: async (_loader: unknown, imports: EngineImports) => ({
        api: {
          Compiler: class {
            compile = async () => {
              const fetched = await imports["typst:engine/host"].fetch({
                path: "shared.typ",
                kind: "project",
              });
              requests.push(fetched);
              return {
                output: { tag: "html", val: "ok" },
                diagnostics: [],
                dependencies: [],
              } as never;
            };
          },
        },
      }),
    } as unknown as EngineModule;
    const { DirectService } = await import("./direct");
    const getCoreModule = () => new WebAssembly.Module(new Uint8Array());
    const service = new DirectService(
      new FileLoaderManager([loader]),
      engine,
      getCoreModule,
    );

    await service.init();
    await service.compile({ format: "html" });
    expect(requests).toEqual([
      { data: new Uint8Array([7]), resolvedPath: "shared.typ" },
    ]);
    await service.dispose();
  });

  it("forwards getCoreModule to the JCO engine unchanged", async () => {
    const getCoreModule = (name: string) => {
      throw new Error(`unexpected core module: ${name}`);
    };
    let received: unknown;
    const engine = {
      instantiate: async (loader: unknown) => {
        received = loader;
        return { api: { Compiler: class {} } };
      },
    } as unknown as EngineModule;
    const { DirectService } = await import("./direct");
    const service = new DirectService(
      new FileLoaderManager([]),
      engine,
      getCoreModule,
    );

    await service.init();
    expect(received).toBe(getCoreModule);
    await service.dispose();
  });
});
