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
{
  pnpmWorkspaces = map (
    packageDir:
    (builtins.fromJSON (builtins.readFile (packagesDir + "/${packageDir}/package.json"))).name
  ) packageDirs;

  sourceFor =
    packageDir:
    fs.toSource {
      root = workspaceRoot;
      fileset = fs.unions (sharedFiles ++ packageJsons ++ [ (workspaceRoot + "/${packageDir}") ]);
    };

  depsSource = fs.toSource {
    root = workspaceRoot;
    fileset = fs.unions (sharedFiles ++ packageJsons);
  };

  # Documentation TypeDoc runs against source files from the public packages.
  sourceForDocs = fs.toSource {
    root = workspaceRoot;
    fileset = fs.unions (
      sharedFiles
      ++ packageJsons
      ++ [
        (workspaceRoot + "/packages/docs/src")
        (workspaceRoot + "/packages/docs/public")
        (workspaceRoot + "/packages/docs/reference-entrypoints")
        (workspaceRoot + "/packages/docs/astro.config.mjs")
        (workspaceRoot + "/packages/docs/package.json")
        (workspaceRoot + "/packages/docs/tsconfig.json")
        (workspaceRoot + "/packages/docs/tsconfig.typedoc.json")
        (workspaceRoot + "/packages/typst-wasm/src")
        (workspaceRoot + "/packages/typst-wasm/tsconfig.json")
        (workspaceRoot + "/packages/typst-wasm/tsconfig.base.json")
        (workspaceRoot + "/packages/vite-plugin-typst/src")
        (workspaceRoot + "/packages/vite-plugin-typst/tsconfig.json")
      ]
    );
  };
}
