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
      example-typst-playground-cloudflare = example-typst-playground.override {
        nitroPreset = "cloudflare_module";
        artifactPath = ".output";
      };
      example-typst-playground-vercel = example-typst-playground.override {
        nitroPreset = "vercel";
        artifactPath = ".vercel/output";
      };
    in
    {
      packages.example-typst-playground = example-typst-playground;
      packages.example-typst-playground-cloudflare = example-typst-playground-cloudflare;
      packages.example-typst-playground-vercel = example-typst-playground-vercel;

      devShells.example-typst-playground = pkgs.mkShell {
        packages = with pkgs; [
          nodejs
          pnpm
        ];
        shellHook = "";
      };
    };
}
