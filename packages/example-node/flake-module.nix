{ ... }:
{
  perSystem = { config, pkgs, ... }:
    let
      example-node = pkgs.callPackage ./package.nix {
        fonts = config.packages.fonts;
        typstWasm = config.packages.typst-wasm;
      };
    in {
      packages.example-node = example-node;
      devShells.example-node = pkgs.mkShell {
        packages = with pkgs; [ nodejs pnpm ];
      };
    };
}
