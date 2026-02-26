import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import * as effectPlugin from "@effect/eslint-plugin/plugin";

export default tseslint.config(
  eslint.configs.recommended,
  tseslint.configs.recommended,
  {
    plugins: {
      "@effect": effectPlugin,
    },
    rules: {
      // Effect-specific rules
      "@effect/no-import-from-barrel-package": "error",
    },
  },
  {
    languageOptions: {
      globals: {
        // Web Worker globals
        self: "readonly",
        importScripts: "readonly",
        // Web APIs
        fetch: "readonly",
        Request: "readonly",
        Response: "readonly",
        URL: "readonly",
        WebAssembly: "readonly",
        TextEncoder: "readonly",
        TextDecoder: "readonly",
        console: "readonly",
      },
    },
  },
  {
    rules: {
      // TypeScript-specific improvements
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "separate-type-imports" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",

      // General best practices
      eqeqeq: ["error", "always", { null: "ignore" }],
      "no-console": "warn",
      "no-debugger": "error",
      "no-duplicate-imports": "error",
      "no-var": "error",
      "prefer-const": "error",
      "object-shorthand": "error",
      "prefer-template": "error",
    },
  },
  {
    files: ["**/*.test.ts", "**/*.spec.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "no-console": "off",
    },
  },
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "*.config.*",
      "scripts/**",
      "test_*.js",
      "**/wasm/*.js",
      "**/wasm/*.d.ts",
    ],
  }
);
