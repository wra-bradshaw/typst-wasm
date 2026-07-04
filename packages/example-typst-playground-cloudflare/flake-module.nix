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
        engineWasm = config.packages.wasm;
        fonts = config.packages.fonts;
        typstWasm = config.packages.typst-wasm;
        nativeBuildInputs = with pkgs; [
          nodejs
          pnpm
        ];
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
