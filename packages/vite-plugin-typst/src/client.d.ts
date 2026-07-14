declare module "*.typ?typst=html" {
  import type { TypstCompiledModule } from "@typst-wasm/vite-plugin-typst";

  export const html: TypstCompiledModule["html"];
  export const metadata: TypstCompiledModule["metadata"];
  export const diagnostics: TypstCompiledModule["diagnostics"];
  export const dependencies: TypstCompiledModule["dependencies"];

  const document: TypstCompiledModule;
  export default document;
}
