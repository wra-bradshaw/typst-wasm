{ ... }:
{
  perSystem =
    {
      config,
      pkgs,
      ...
    }:
    let
      example-typst-playground = pkgs.callPackage ./package.nix {
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
      packages.example-typst-playground = example-typst-playground;

      devShells.example-typst-playground = pkgs.mkShell {
        packages = with pkgs; [
          nodejs
          pnpm
        ];
        shellHook = "";
      };
    };
}
