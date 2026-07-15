{ ... }:
{
  perSystem =
    { config, pkgs, ... }:
    let
      docs = pkgs.callPackage ./package.nix {
        typstWasm = config.packages.typst-wasm;
        vitePluginTypst = config.packages.vite-plugin-typst;
      };
    in
    {
      packages.docs = docs;
      devShells.docs = pkgs.mkShell {
        packages = with pkgs; [
          nodejs
          pnpm
        ];
      };
    };
}
