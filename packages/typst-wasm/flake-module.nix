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

      typst-wasm-with-engine = pkgs.callPackage ./package.nix {
        fonts = config.packages.fonts;
        wasm = config.packages.wasm;
        nativeBuildInputs = typstWasmNativeBuildInputs;
      };
    in
    {
      packages.typst-wasm = typst-wasm;
      packages.default = typst-wasm;
      checks = typst-wasm.passthru.tests // {
        inherit (typst-wasm-with-engine.passthru.tests) e2e-node e2e-bun e2e-deno;
      };

      devShells.typst-wasm = pkgs.mkShell {
        inputsFrom = [
          config.devShells.engine-wasm
        ];
        packages = typstWasmNativeBuildInputs;
        shellHook = "";
      };
    };
}
