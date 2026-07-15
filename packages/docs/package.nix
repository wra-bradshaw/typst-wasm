{
  pkgs,
  typstWasm,
  vitePluginTypst,
}:

let
  workspaceRoot = ../..;
  pname = "typst-wasm-docs";
  version = "0.0.0";
  pnpmDeps = import ../../nix/pnpm-deps.nix { inherit pkgs workspaceRoot; };
  workspaceFiles = import ../../nix/workspace-files.nix {
    inherit (pkgs) lib;
    inherit workspaceRoot;
  };
  src = workspaceFiles.sourceFor "packages/docs";
  prepareWorkspaceArtifacts = import ../../nix/workspace-artifacts.nix { lib = pkgs.lib; };
  prepareBuildArtifacts = prepareWorkspaceArtifacts [
    {
      packageDir = "packages/typst-wasm";
      derivation = typstWasm;
    }
    {
      packageDir = "packages/vite-plugin-typst";
      derivation = vitePluginTypst;
    }
  ];
in
pkgs.stdenvNoCC.mkDerivation {
  inherit
    pname
    version
    src
    pnpmDeps
    ;

  nativeBuildInputs = [
    pkgs.nodejs
    pkgs.pnpmConfigHook
    pkgs.pnpm
  ];

  buildPhase = ''
    runHook preBuild
    ${prepareBuildArtifacts}
    pnpm --dir packages/docs run build:local
    runHook postBuild
  '';

  installPhase = ''
    runHook preInstall
    mkdir -p "$out"
    cp -r packages/docs/dist "$out/dist"
    runHook postInstall
  '';
}
