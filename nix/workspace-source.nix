{
  lib,
  workspaceRoot,
  packageDir,
}:

let
  workspaceFiles = import ./workspace-files.nix { inherit lib workspaceRoot; };
in
workspaceFiles.sourceFor packageDir
