{ ... }:
{
  perSystem =
    {
      config,
      pkgs,
      ...
    }:
    let
      example-typst-playground-next = pkgs.callPackage ./package.nix {
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
      packages.example-typst-playground-next = example-typst-playground-next;

      devShells.example-typst-playground-next = pkgs.mkShell {
        packages = with pkgs; [
          nodejs
          pnpm
        ];
        shellHook = "";
      };
    };
}
