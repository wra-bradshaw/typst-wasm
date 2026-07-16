import type { CoreModuleName, CoreModules } from "./types";

export const coreModuleNames = [
  "engine.core.wasm",
  "engine.core2.wasm",
  "engine.core3.wasm",
] as const satisfies readonly CoreModuleName[];

export type ResolvedCoreModules = Record<CoreModuleName, WebAssembly.Module>;

export const resolveCoreModules = async (
  coreModules: CoreModules,
): Promise<ResolvedCoreModules> => {
  const resolved = await Promise.all(
    coreModuleNames.map(async (name) => {
      const module = await coreModules[name];
      if (module === undefined) throw new Error(`Missing core module: ${name}`);
      return [name, module] as const;
    }),
  );
  return Object.fromEntries(resolved) as ResolvedCoreModules;
};

export const getCoreModule =
  (coreModules: ResolvedCoreModules) =>
  (name: string): WebAssembly.Module => {
    const module = coreModules[name as CoreModuleName];
    if (module === undefined) throw new Error(`Unknown core module: ${name}`);
    return module;
  };
