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
        ./packages/vite-plugin-typst/flake-module.nix
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

          nodejsSlimPinned = pkgs-node.nodejs-slim_24 // {
            override =
              args:
              pkgs-node.nodejs-slim_24.override (
                removeAttrs args [
                  "nodejs-slim"
                ]
              );
          };
          nodejsPinned = pkgs-node.nodejs_24 // {
            override =
              args:
              pkgs-node.nodejs_24.override (
                removeAttrs args [
                  "nodejs-slim"
                ]
              );
          };

          nodeOverlay = final: prev: {
            nodejs = nodejsPinned;
            nodejs-slim = nodejsSlimPinned;
            pnpm = prev.pnpm_11.override { nodejs-slim = nodejsSlimPinned; };
          };

          pkgs = import inputs.nixpkgs {
            inherit system;
            overlays = [
              inputs.fenix.overlays.default
              nodeOverlay
            ];
            config.allowUnfree = true;
          };

          buildArtifactApp = pkgs.writeShellApplication {
            name = "typst-wasm-build-artifact";
            runtimeInputs = [
              pkgs.coreutils
              pkgs.git
            ];
            text = ''
              usage() {
                echo "Usage: nix run .#build-artifact -- <flake-attr> [artifact-path]" >&2
                exit 64
              }

              if [ "$#" -lt 1 ] || [ "$#" -gt 2 ]; then
                usage
              fi

              repo_root=$(git rev-parse --show-toplevel)
              flake_attr=$1
              artifact_path=''${2:-dist}

              case "$artifact_path" in
                /*)
                  echo "artifact-path must be relative and stay inside the package directory" >&2
                  exit 64
                  ;;
              esac

              case "$artifact_path" in
                .. | ../* | */.. | */../*)
                  echo "artifact-path must stay inside the package directory" >&2
                  exit 64
                  ;;
              esac

              package_root=$(pwd)
              target="$package_root/$artifact_path"

              if [ -e "$target" ]; then
                chmod -R u+w "$target"
                rm -rf "$target"
              fi

              out_path=$(nix build "$repo_root#$flake_attr" --no-link --print-out-paths)

              mkdir -p "$(dirname "$target")"
              cp -R "$out_path/$artifact_path" "$target"
              chmod -R u+w "$target"
            '';
          };
        in
        {
          _module.args.pkgs = pkgs;

          formatter = pkgs.nixfmt-rfc-style;

          apps.build-artifact = {
            type = "app";
            program = "${buildArtifactApp}/bin/typst-wasm-build-artifact";
          };

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
            inputsFrom = [ config.devShells.typst-wasm ];
            packages = [
              config.formatter
              pkgs.nodejs
              pkgs.pnpm
            ];
          };
        };
    };
}
