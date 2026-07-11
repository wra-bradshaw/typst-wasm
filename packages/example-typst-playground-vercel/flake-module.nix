{ ... }:
{
  perSystem =
    {
      config,
      pkgs,
      ...
    }:
    let
      example-typst-playground-vercel = pkgs.callPackage ./package.nix {
        engineWasm = config.packages.engine-wasm;
        fonts = config.packages.fonts;
        typstWasm = config.packages.typst-wasm;
      };
    in
    {
      packages.example-typst-playground-vercel = example-typst-playground-vercel;

      devShells.example-typst-playground-vercel = pkgs.mkShell {
        packages = with pkgs; [
          nodejs
          pnpm
        ];
        shellHook = "";
      };
    };
}
