declare module "@typst-wasm/engine-wasm/worker" {
  import type { EngineModule } from "./engine/types";
  export const instantiate: EngineModule["instantiate"];
}

declare module "@typst-wasm/engine-wasm/jspi" {
  import type { EngineModule } from "./engine/types";
  export const instantiate: EngineModule["instantiate"];
}
