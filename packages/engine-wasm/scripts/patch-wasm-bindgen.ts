import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const PATCH_MARKER = "/* __typst_wasm_custom_imports_patch__ */";
const DEFAULT_WASM_DIR = fileURLToPath(new URL("../out", import.meta.url));

const normalizePatchedSource = (source: string): string => {
  let normalized = source;

  normalized = normalized.replace(
    /let thread_stack_size\s*\n\s*let customImports\s*\n\s*let customImports/g,
    "let thread_stack_size\n    let customImports",
  );

  normalized = normalized.replace(
    /async function __wbg_init\(module_or_path, memory\) \{\n(\s*)if \(wasm !== undefined\) return wasm;\n\n(\s*)let thread_stack_size(?!\s*\n\s*let customImports)/,
    "async function __wbg_init(module_or_path, memory) {\n$1if (wasm !== undefined) return wasm;\n\n$2let thread_stack_size\n$2let customImports",
  );

  return normalized;
};

const replaceOnce = (source: string, from: string, to: string): string => {
  if (!source.includes(from)) {
    throw new Error(`Patch anchor not found: ${from.slice(0, 80)}`);
  }
  return source.replace(from, to);
};

const replaceWithRegex = (source: string, pattern: RegExp, to: string, label: string): string => {
  if (!pattern.test(source)) {
    throw new Error(`Patch anchor not found: ${label}`);
  }
  return source.replace(pattern, to);
};

const replaceIfRegex = (source: string, pattern: RegExp, to: string): string => {
  if (!pattern.test(source)) {
    return source;
  }
  return source.replace(pattern, to);
};

const resolveWasmDir = (): string => {
  const requestedDir = process.env.WASM_OUTPUT_DIR ?? process.argv[2];
  return requestedDir ? resolve(requestedDir) : resolve(DEFAULT_WASM_DIR);
};

export const applyPatch = (source: string): string => {
  let patched = normalizePatchedSource(source);

  patched = patched.replace(/^import \* as import\d+ from "bridge"\n?/gm, "");

  if (!patched.includes(PATCH_MARKER)) {
    patched = replaceWithRegex(
      patched,
      /function __wbg_get_imports\(memory(?:,\s*customImports)?\) \{/,
      `${PATCH_MARKER}\nfunction __wbg_get_imports(memory, customImports) {`,
      "function __wbg_get_imports(...) {",
    );
  } else {
    patched = replaceWithRegex(
      patched,
      /function __wbg_get_imports\(memory(?:,\s*customImports)?\) \{/,
      "function __wbg_get_imports(memory, customImports) {",
      "function __wbg_get_imports(...) {",
    );
  }

  if (!patched.includes("const imports = {\n        __proto__: null,\n        \"./typst_wasm_bg.js\": import0,")) {
    patched = replaceWithRegex(
      patched,
      /    return \{\n        __proto__: null,\n        "\.\/typst_wasm_bg\.js": import0,\n(?:        "bridge": import\d+,\n)?    \};/,
      `    const imports = {
        __proto__: null,
        "./typst_wasm_bg.js": import0,
    };
    if (customImports && typeof customImports === "object") {
        for (const [moduleName, moduleImports] of Object.entries(customImports)) {
            const existing = imports[moduleName] ?? { __proto__: null };
            imports[moduleName] = Object.assign(existing, moduleImports ?? {});
        }
    }
    return imports;`,
      "return import object block",
    );
  }

  if (patched.includes("            ({module, memory, thread_stack_size} = module)")) {
    patched = replaceOnce(
      patched,
      "            ({module, memory, thread_stack_size} = module)",
      "            ({module, memory, thread_stack_size, imports: customImports} = module)",
    );
  }

  patched = replaceIfRegex(
    patched,
    /function initSync\(module, memory\) \{\n    if \(wasm !== undefined\) return wasm;\n\n    let thread_stack_size(?!\n\s*let customImports)/,
    "function initSync(module, memory) {\n    if (wasm !== undefined) return wasm;\n\n    let thread_stack_size\n    let customImports",
  );
  if (patched.includes("            ({module_or_path, memory, thread_stack_size} = module_or_path)")) {
    patched = replaceOnce(
      patched,
      "            ({module_or_path, memory, thread_stack_size} = module_or_path)",
      "            ({module_or_path, memory, thread_stack_size, imports: customImports} = module_or_path)",
    );
  }

  patched = replaceIfRegex(
    patched,
    /async function __wbg_init\(module_or_path, memory\) \{\n    if \(wasm !== undefined\) return wasm;\n\n    let thread_stack_size(?!\n\s*let customImports)/,
    "async function __wbg_init(module_or_path, memory) {\n    if (wasm !== undefined) return wasm;\n\n    let thread_stack_size\n    let customImports",
  );

  patched = patched.replaceAll("    const imports = __wbg_get_imports(memory);", "    const imports = __wbg_get_imports(memory, customImports);");

  return patched;
};

const run = () => {
  const wasmJsPath = resolve(resolveWasmDir(), "typst_wasm.js");
  const source = readFileSync(wasmJsPath, "utf8");
  const patched = applyPatch(source);

  if (patched !== source) {
    writeFileSync(wasmJsPath, patched, "utf8");
    console.log("[patch-wasm-bindgen] applied");
  } else {
    console.log("[patch-wasm-bindgen] already up-to-date");
  }
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  run();
}
