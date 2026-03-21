import { describe, expect, it } from "vitest";
import { applyPatch } from "../scripts/patch-wasm-bindgen";

const wasmBindgenFixture = `import * as import1 from "bridge"

function __wbg_get_imports(memory) {
    const import0 = {
        __proto__: null,
        memory: memory || new WebAssembly.Memory({ initial: 1, maximum: 1, shared: true }),
    };
    return {
        __proto__: null,
        "./typst_wasm_bg.js": import0,
        "bridge": import1,
    };
}

let wasm;

async function __wbg_init(module_or_path, memory) {
    if (wasm !== undefined) return wasm;

    let thread_stack_size
    if (typeof module_or_path === 'object' && 'module_or_path' in module_or_path) {
            ({module_or_path, memory, thread_stack_size} = module_or_path)
    }
    const imports = __wbg_get_imports(memory);
    return imports;
}
`;

describe("patch-wasm-bindgen", () => {
  it("applies patch and is idempotent", () => {
    const once = applyPatch(wasmBindgenFixture);
    const twice = applyPatch(once);

    expect(once).toContain("/* __typst_wasm_custom_imports_patch__ */");
    expect(once).toContain("function __wbg_get_imports(memory, customImports)");
    expect(once).toContain("imports: customImports");
    expect(twice).toBe(once);
  });

  it("fails loudly when expected anchors are missing", () => {
    expect(() => applyPatch("function nope() {}")).toThrowError("Patch anchor not found");
  });
});
