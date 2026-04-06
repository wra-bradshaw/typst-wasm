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
        nodejs_25
        bun
        deno
        gnutar
        pnpm_10
      ];

      typst-wasm = pkgs.callPackage ./package.nix {
        fonts = config.packages.fonts;
        wasm = config.packages.wasm;
        nativeBuildInputs = typstWasmNativeBuildInputs;
      };
    in
    {
      packages.typst-wasm = typst-wasm;
      packages.default = typst-wasm;
      checks = typst-wasm.passthru.tests;

      devShells.typst-wasm = pkgs.mkShell {
        inputsFrom = [
          config.devShells.fonts
          config.devShells.engine-wasm
        ];
        packages = typstWasmNativeBuildInputs;
        shellHook = "";
      };
    };
}
