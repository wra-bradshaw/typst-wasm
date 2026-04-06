{ inputs, ... }:
{
  perSystem =
    {
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

      engineWasmDevInputs =
        with pkgs;
        [
          rustToolchain
          binaryen
          nodejs_25
          wasm-bindgen-cli_0_2_108
        ]
        ++ (lib.optionals stdenv.isDarwin [
          apple-sdk
          libiconv
        ]);

      wasm = pkgs.callPackage ./package.nix {
        inherit craneLib;
        inherit rustSrc;
        inherit rustToolchain;
      };
    in
    {
      packages.wasm = wasm;

      devShells.engine-wasm = pkgs.mkShell {
        packages = engineWasmDevInputs;
        shellHook = "";
      };
    };
}
