{ pkgs, workspaceRoot }:

let
  workspaceFiles = import ./workspace-files.nix {
    inherit (pkgs) lib;
    inherit workspaceRoot;
  };
in
pkgs.fetchPnpmDeps {
  pname = "typst-wasm-workspace";
  version = "deps";

  src = workspaceFiles.depsSource;

  pnpm = pkgs.pnpm;
  inherit (workspaceFiles) pnpmWorkspaces;

  fetcherVersion = 4;
  hash = "sha256-vcv5+4F16kNpYrcCITB5FSsAMbsGoQhWZfeYH6RJqDI=";
}
