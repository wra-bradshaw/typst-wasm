{ lib, workspaceRoot }:

let
  fs = lib.fileset;
  packagesDir = workspaceRoot + "/packages";

  packageDirs = builtins.attrNames (
    builtins.filterAttrs (
      name: type: type == "directory" && builtins.pathExists (packagesDir + "/${name}/package.json")
    ) (builtins.readDir packagesDir)
  );

  packageJsons = map (packageDir: packagesDir + "/${packageDir}/package.json") packageDirs;

  optionalPath = path: lib.optional (builtins.pathExists path) path;

  sharedFiles = [
    (workspaceRoot + "/package.json")
    (workspaceRoot + "/pnpm-lock.yaml")
  ]
  ++ optionalPath (workspaceRoot + "/pnpm-workspace.yaml")
  ++ optionalPath (workspaceRoot + "/pnpm-workspace.yml")
  ++ optionalPath (workspaceRoot + "/.npmrc");
in
rec {
  pnpmWorkspaces = map (
    packageDir:
    (builtins.fromJSON (builtins.readFile (packagesDir + "/${packageDir}/package.json"))).name
  ) packageDirs;

  sourceForWith =
    packageDir: extraFiles:
    fs.toSource {
      root = workspaceRoot;
      fileset = fs.unions (
        sharedFiles
        ++ packageJsons
        ++ [ (workspaceRoot + "/${packageDir}") ]
        ++ map (file: workspaceRoot + "/${file}") extraFiles
      );
    };

  sourceFor = packageDir: sourceForWith packageDir [];

  depsSource = fs.toSource {
    root = workspaceRoot;
    fileset = fs.unions (sharedFiles ++ packageJsons);
  };
}
