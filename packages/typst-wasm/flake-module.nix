{ inputs, ... }:
{
  perSystem =
    {
      config,
      pkgs,
      ...
    }:
    let
      lib = pkgs.lib;
      stdenv = pkgs.stdenv;
      rustSrc = pkgs.fenix.complete."rust-src";
      rustToolchain = pkgs.fenix.combine [
        (pkgs.fenix.complete.withComponents [
          "cargo"
          "clippy"
          "rust-src"
          "rustc"
          "rustfmt"
          "llvm-tools-preview"
        ])
        pkgs.fenix.targets.wasm32-unknown-unknown.latest.rust-std
      ];
      craneLib = (inputs.crane.mkLib pkgs).overrideToolchain rustToolchain;
      fonts = config.packages.fonts;
      typst-wasm = pkgs.callPackage ./package.nix {
        inherit craneLib rustSrc rustToolchain fonts;
      };
    in
    {
      packages.typst-wasm = typst-wasm;
      packages.default = typst-wasm;

      devShells.typst-wasm = pkgs.mkShell {
        packages = with pkgs; [
          rustToolchain
          binaryen
          nodejs
          bun
          deno
          gnutar
          pnpm
          wasm-tools
          xz
        ] ++ lib.optionals stdenv.isDarwin [ apple-sdk libiconv ];
        shellHook = "";
      };
    };
}
