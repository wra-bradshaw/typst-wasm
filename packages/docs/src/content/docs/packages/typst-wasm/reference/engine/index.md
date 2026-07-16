---
title: "Engine core WASM assets"
description: "Core WASM assets used by typst-wasm."
---

The `typst-wasm/engine/engine.core*.wasm` exports provide the core WebAssembly
assets required when configuring `coreModules`. The generated engine modules
are bundled into the public compiler and worker entrypoints and are not
separately exported.
