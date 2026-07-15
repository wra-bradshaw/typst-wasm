{ ... }:
{
  perSystem =
    {
      config,
      pkgs,
      ...
    }:
    let
      example-typst-blog = pkgs.callPackage ./package.nix {
        fonts = config.packages.fonts;
        typstWasm = config.packages.typst-wasm;
        vitePluginTypst = config.packages.vite-plugin-typst;
      };
    in
    {
      packages.example-typst-blog = example-typst-blog;

      devShells.example-typst-blog = pkgs.mkShell {
        packages = with pkgs; [
          nodejs
          pnpm
        ];
        shellHook = "";
      };
    };
}
