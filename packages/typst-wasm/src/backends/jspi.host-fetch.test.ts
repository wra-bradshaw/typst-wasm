import { describe, expect, it, vi } from "vitest";
import { FileLoaderManager } from "../files/loaders";
import type { TypstFileLoader } from "../compiler/types";
import type { EngineImports, EngineModule } from "../engine/types";

let mockEngine = {} as EngineModule;
vi.mock("../engine/generated/jspi/engine.js", () => ({
  instantiate: (...args: any[]) =>
    (mockEngine.instantiate as (...args: any[]) => unknown)(...args),
}));

const loader: TypstFileLoader = async (request) =>
  request.path === "shared.typ"
    ? { data: new Uint8Array([7]), resolvedPath: "shared.typ" }
    : null;

describe("JspiService host fetch routing", () => {
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
    mockEngine = engine;
    const { JspiService } = await import("./jspi");
    const service = new JspiService(new FileLoaderManager([loader]), {
      "engine.core.wasm": {} as WebAssembly.Module,
      "engine.core2.wasm": Promise.resolve({} as WebAssembly.Module),
      "engine.core3.wasm": {} as WebAssembly.Module,
    });

    await service.init();
    await service.compile({ format: "html" });
    expect(requests).toEqual([
      { data: new Uint8Array([7]), resolvedPath: "shared.typ" },
    ]);
    await service.dispose();
  });

  it("passes resolved core modules to the engine loader", async () => {
    let received: ((name: string) => WebAssembly.Module) | undefined;
    const engine = {
      instantiate: async (loader: (name: string) => WebAssembly.Module) => {
        received = loader;
        return { api: { Compiler: class {} } };
      },
    } as unknown as EngineModule;
    mockEngine = engine;
    const { JspiService } = await import("./jspi");
    const modules = {
      "engine.core.wasm": {} as WebAssembly.Module,
      "engine.core2.wasm": Promise.resolve({} as WebAssembly.Module),
      "engine.core3.wasm": {} as WebAssembly.Module,
    };
    const service = new JspiService(new FileLoaderManager([]), modules);

    await service.init();
    expect(received?.("engine.core2.wasm")).toBe(
      await modules["engine.core2.wasm"],
    );
    await expect(
      Promise.resolve().then(() => received?.("unknown")),
    ).rejects.toThrow("Unknown core module: unknown");
    await service.dispose();
  });
});
