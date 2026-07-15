{ ... }:
{
  perSystem =
    {
      config,
      pkgs,
      ...
    }:
    let
      example-typst-playground-cloudflare = pkgs.callPackage ./package.nix {
        fonts = config.packages.fonts;
        typstWasm = config.packages.typst-wasm;
      };
    in
    {
      packages.example-typst-playground-cloudflare = example-typst-playground-cloudflare;

      devShells.example-typst-playground-cloudflare = pkgs.mkShell {
        packages = with pkgs; [
          nodejs
          pnpm
        ];
        shellHook = "";
      };
    };
}
