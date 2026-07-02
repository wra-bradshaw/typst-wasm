{ pkgs, workspaceRoot }:

let
  packagesDir = workspaceRoot + "/packages";
  packageDirs = builtins.attrNames (
    builtins.filterAttrs (
      name: type: type == "directory" && builtins.pathExists (packagesDir + "/${name}/package.json")
    ) (builtins.readDir packagesDir)
  );
  pnpmWorkspaces = builtins.map (
    packageDir:
    (builtins.fromJSON (builtins.readFile (packagesDir + "/${packageDir}/package.json"))).name
  ) packageDirs;
in
pkgs.fetchPnpmDeps {
  pname = "typst-wasm-workspace";
  version = "deps";
  src = workspaceRoot;
  pnpm = pkgs.pnpm;
  inherit pnpmWorkspaces;
  fetcherVersion = 4;
  hash = "";
}
