declare module "*.typ" {
  import type { TypstCompiledModule } from "vite-plugin-typst";

  export const html: TypstCompiledModule["html"];
  export const metadata: TypstCompiledModule["metadata"];
  export const diagnostics: TypstCompiledModule["diagnostics"];
  export const dependencies: TypstCompiledModule["dependencies"];
  const document: TypstCompiledModule;
  export default document;
}
