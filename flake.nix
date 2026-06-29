{
  description = "Development shell for typst-wasm";

  inputs = {
    nixpkgs.url = "https://flakehub.com/f/DeterminateSystems/nixpkgs-weekly/0.1";
    nixpkgs-node.url = "github:NixOS/nixpkgs/346dd96ad74dc4457a9db9de4f4f57dab2e5731d";
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
          pkgs-node = import inputs.nixpkgs-node {
            inherit system;
          };
          nodejsPinned = pkgs-node.nodejs_24 // {
            override =
              args:
              pkgs-node.nodejs_24.override (builtins.removeAttrs args [
                "nodejs-slim"
              ]);
          };

          nodeOverlay = final: prev: {
            nodejs = nodejsPinned;
            pnpm = prev.pnpm_11.override { nodejs = nodejsPinned; };
          };

          pkgs = import inputs.nixpkgs {
            inherit system;
            overlays = [
              inputs.fenix.overlays.default
              nodeOverlay
            ];
            config.allowUnfree = true;
          };
        in
        {
          _module.args.pkgs = pkgs;

          formatter = pkgs.nixfmt-rfc-style;

          devShells.default = pkgs.mkShell {
            inputsFrom = [ config.devShells.typst-wasm ];
            packages = [
              config.formatter
              pkgs.nodejs
              pkgs.pnpm
            ];
            shellHook = "";
          };

          devShells.ci = pkgs.mkShell {
            packages = [
              pkgs.nodejs
              pkgs.pnpm
            ];
          };
        };
    };
}
