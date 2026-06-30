{ ... }:
{
  perSystem =
    {
      config,
      pkgs,
      ...
    }:
    let
      typstWasmNativeBuildInputs = with pkgs; [
        nodejs
        bun
        deno
        gnutar
        pnpm
        xz
      ];

      typst-wasm = pkgs.callPackage ./package.nix {
        fonts = config.packages.fonts;
        nativeBuildInputs = typstWasmNativeBuildInputs;
      };

    in
    {
      packages.typst-wasm = typst-wasm;
      packages.default = typst-wasm;

      devShells.typst-wasm = pkgs.mkShell {
        inputsFrom = [
          config.devShells.engine-wasm
        ];
        packages = typstWasmNativeBuildInputs;
        shellHook = "";
      };
    };
}
