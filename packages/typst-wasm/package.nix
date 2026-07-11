{
  pkgs,
  engineWasm,
  fonts,
}:

let
  workspaceRoot = ../..;
  pname = "typst-wasm";
  version = (builtins.fromJSON (builtins.readFile ./package.json)).version;
  packageDir = "packages/typst-wasm";
  pnpmDeps = import ../../nix/pnpm-deps.nix { inherit pkgs workspaceRoot; };
  src = import ../../nix/workspace-source.nix {
    inherit (pkgs) lib;
    inherit workspaceRoot packageDir;
  };
  prepareWorkspaceArtifacts = import ../../nix/workspace-artifacts.nix { lib = pkgs.lib; };

  pnpmNativeBuildInputs = [
    pkgs.nodejs
    pkgs.pnpmConfigHook
    pkgs.pnpm
  ];

  prepareBuildArtifacts = prepareWorkspaceArtifacts [
    {
      packageDir = "packages/fonts";
      outputPath = "dist/files";
      derivation = fonts;
    }
    {
      packageDir = "packages/engine-wasm";
      derivation = engineWasm;
    }
  ];

  buildBundle = ''
    pnpm --dir ${packageDir} exec tsdown
  '';
in
pkgs.stdenvNoCC.mkDerivation {
  inherit pname version;
  inherit src pnpmDeps;

  nativeBuildInputs = pnpmNativeBuildInputs;

  buildPhase = ''
    runHook preBuild

    ${prepareBuildArtifacts}

    ${buildBundle}

    runHook postBuild
  '';

  installPhase = ''
    runHook preInstall

    mkdir -p "$out"
    cp -r packages/typst-wasm/dist "$out/dist"

    runHook postInstall
  '';
}
