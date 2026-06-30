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

  pnpmDeps = pkgs.fetchPnpmDeps {
    inherit pname;
    version = "deps";
    src = workspaceRoot;
    pnpm = pkgs.pnpm;
    pnpmWorkspaces = [
      "@typst-wasm/engine-wasm"
      "@typst-wasm/fonts"
      pname
      "@typst-wasm/vite-plugin-typst"
    ];
    fetcherVersion = 4;
    hash = "sha256-M6c700sSI5Q37aY6xSlNFdp541TmNSyK87zNul4LXPo=";
  };

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
