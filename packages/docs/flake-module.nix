{ ... }:
{
  perSystem =
    { config, pkgs, ... }:
    let
      docs = pkgs.callPackage ./package.nix {
        typstWasm = config.packages.typst-wasm;
        engineWasm = config.packages.engine-wasm;
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
