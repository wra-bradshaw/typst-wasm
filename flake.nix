{
  description = "Development shell for typst-wasm";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    flake-parts.url = "github:hercules-ci/flake-parts";
    crane.url = "github:ipetkov/crane";
    fenix = {
      url = "github:nix-community/fenix/monthly";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs =
    inputs@{
      flake-parts,
      ...
    }:
    flake-parts.lib.mkFlake { inherit inputs; } {
      imports = [
        ./packages/fonts/flake-module.nix
        ./packages/engine-wasm/flake-module.nix
        ./packages/typst-wasm/flake-module.nix
      ];

      systems = [
        "x86_64-linux"
        "aarch64-linux"
        "aarch64-darwin"
      ];

      perSystem =
        {
          config,
          system,
          ...
        }:
        let
          pkgs = import inputs.nixpkgs {
            inherit system;
            overlays = [ inputs.fenix.overlays.default ];
            config.allowUnfree = true;
          };
        in
        {
          _module.args.pkgs = pkgs;

          formatter = pkgs.nixfmt-rfc-style;

          devShells.default = pkgs.mkShell {
            inputsFrom = [ config.devShells.typst-wasm ];
            packages = [ config.formatter ];
            shellHook = "";
          };
        };
    };
}
