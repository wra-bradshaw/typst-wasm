{ ... }:
{
  perSystem = { config, pkgs, ... }:
    let
      example-vite-react-cloudflare = pkgs.callPackage ./package.nix {
        fonts = config.packages.fonts;
        typstWasm = config.packages.typst-wasm;
      };
    in {
      packages.example-vite-react-cloudflare = example-vite-react-cloudflare;
      devShells.example-vite-react-cloudflare = pkgs.mkShell {
        packages = with pkgs; [ nodejs pnpm ];
      };
    };
}
