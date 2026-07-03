{
  pkgs,
  engineWasm,
  fonts,
  typstWasm,
  nitroPreset ? null,
  artifactPath ? ".output",
  nativeBuildInputs ? [ ],
}:

let
  workspaceRoot = ../..;
  pname = "example-typst-playground";
  packageDir = "packages/example-typst-playground";
  version = (builtins.fromJSON (builtins.readFile ./package.json)).version;
  pnpmDeps = import ../../nix/pnpm-deps.nix { inherit pkgs workspaceRoot; };
  prepareWorkspaceArtifacts = import ../../nix/workspace-artifacts.nix { lib = pkgs.lib; };

  pnpmNativeBuildInputs = nativeBuildInputs ++ [
    pkgs.nodejs
    pkgs.pnpmConfigHook
    pkgs.pnpm
  ];

  buildBundle =
    if nitroPreset == null then
      ''
        pnpm --dir ${packageDir} exec vite build
      ''
    else
      ''
        NITRO_PRESET=${nitroPreset} pnpm --dir ${packageDir} exec vite build
      '';

  prepareBuildArtifacts = prepareWorkspaceArtifacts [
    {
      packageDir = "packages/engine-wasm";
      derivation = engineWasm;
    }
    {
      packageDir = "packages/fonts";
      derivation = fonts;
    }
    {
      packageDir = "packages/typst-wasm";
      derivation = typstWasm;
    }
  ];
in
pkgs.stdenvNoCC.mkDerivation {
  inherit pname version;
  src = workspaceRoot;
  inherit pnpmDeps;

  nativeBuildInputs = pnpmNativeBuildInputs;

  buildPhase = ''
    runHook preBuild

    ${prepareBuildArtifacts}

    ${buildBundle}
    runHook postBuild
  '';

  installPhase = ''
    runHook preInstall
    mkdir -p "$out/$(dirname ${artifactPath})"
    cp -r packages/example-typst-playground/${artifactPath} "$out/${artifactPath}"
    runHook postInstall
  '';
}
