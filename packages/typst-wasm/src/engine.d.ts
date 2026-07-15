declare module "typst-wasm/engine/worker" {
  import type { EngineModule } from "./engine/types";
  export const instantiate: EngineModule["instantiate"];
}

declare module "typst-wasm/engine" {
  import type { EngineModule } from "./engine/types";
  export const instantiate: EngineModule["instantiate"];
}
