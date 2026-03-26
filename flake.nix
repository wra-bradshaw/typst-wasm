{
  description = "Development shell for typst-wasm";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    fenix = {
      url = "github:nix-community/fenix/monthly";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs =
    { self, ... }@inputs:
    let
      supportedSystems = [
        "x86_64-linux"
        "aarch64-linux"
        "aarch64-darwin"
      ];

      forEachSupportedSystem =
        f:
        inputs.nixpkgs.lib.genAttrs supportedSystems (
          system:
          f {
            inherit system;
            pkgs = import inputs.nixpkgs {
              inherit system;
              overlays = [ inputs.fenix.overlays.default ];
              config.allowUnfree = true;
            };
          }
        );
    in
    {
      packages = forEachSupportedSystem (
        { pkgs, ... }:
        let
          fonts = pkgs.callPackage ./fonts.nix { };
          wasm = pkgs.callPackage ./wasm.nix { };
        in
        {
          inherit fonts wasm;
          typst-wasm = pkgs.callPackage ./typst-wasm.nix {
            inherit fonts wasm;
          };
        }
      );

      devShells = forEachSupportedSystem (
        { pkgs, system }:
        {
          default = pkgs.mkShell {
            nativeBuildInputs =
              with pkgs;
              [
                self.formatter.${system}
                (fenix.combine [
                  (fenix.complete.withComponents [
                    "cargo"
                    "clippy"
                    "rust-src"
                    "rustc"
                    "rustfmt"
                    "llvm-tools-preview"
                  ])
                  fenix.targets.wasm32-unknown-unknown.latest.rust-std
                ])
                nodejs_25
                bun
                deno
                wasm-pack
                wasm-bindgen-cli
                pkg-config
                libiconv
                wasm-tools
                wabt
                gnutar
              ]
              ++ (lib.optionals stdenv.isDarwin [
                apple-sdk
              ]);

            shellHook = "";
          };
        }
      );

      formatter = forEachSupportedSystem ({ pkgs, ... }: pkgs.nixfmt-rfc-style);
    };
}
