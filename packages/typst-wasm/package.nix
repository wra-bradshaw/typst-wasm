{
  pkgs,
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
      pname
    ];
    fetcherVersion = 3;
    hash = "sha256-J2Z6cfW3In3ATja4cmhy3KMQvV+HiEoQHGxaIj5EKtQ=";
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
