{
  pkgs,
  engineWasm,
  fonts,
  nativeBuildInputs ? [ ],
}:

let
  workspaceRoot = ../..;
  pname = "typst-wasm";
  version = (builtins.fromJSON (builtins.readFile ./package.json)).version;
  packageDir = "packages/typst-wasm";
  pnpmDeps = import ../../nix/pnpm-deps.nix { inherit pkgs workspaceRoot; };

  pnpmNativeBuildInputs = nativeBuildInputs ++ [
    pkgs.nodejs
    pkgs.pnpmConfigHook
    pkgs.pnpm
  ];

  prepareFontArtifacts = ''
    mkdir -p packages/fonts/dist
    cp -R ${fonts}/dist/files packages/fonts/dist/files
  '';

  prepareEngineArtifacts = ''
    mkdir -p packages/engine-wasm/dist
    cp -R ${engineWasm}/dist/. packages/engine-wasm/dist
  '';

  buildBundle = ''
    pnpm --dir ${packageDir} exec tsdown
  '';
in
pkgs.stdenvNoCC.mkDerivation {
  inherit pname version;
  src = workspaceRoot;
  inherit pnpmDeps;

  nativeBuildInputs = pnpmNativeBuildInputs;

  buildPhase = ''
    runHook preBuild

    ${prepareFontArtifacts}
    ${prepareEngineArtifacts}

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
