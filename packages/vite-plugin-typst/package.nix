{
  pkgs,
  nativeBuildInputs ? [ ],
}:

let
  workspaceRoot = ../..;
  pname = "vite-plugin-typst";
  pnpmWorkspaceName = "@typst-wasm/vite-plugin-typst";
  version = (builtins.fromJSON (builtins.readFile ./package.json)).version;

  pnpmDeps = pkgs.fetchPnpmDeps {
    inherit pname;
    version = "deps";
    src = workspaceRoot;
    pnpm = pkgs.pnpm;
    pnpmWorkspaces = [
      pnpmWorkspaceName
      "typst-wasm"
    ];
    fetcherVersion = 3;
    hash = "sha256-J2Z6cfW3In3ATja4cmhy3KMQvV+HiEoQHGxaIj5EKtQ=";
  };

  pnpmNativeBuildInputs = nativeBuildInputs ++ [
    pkgs.nodejs
    pkgs.pnpmConfigHook
    pkgs.pnpm
  ];

  buildBundle = ''
    pnpm turbo run bundle --filter=${pnpmWorkspaceName} --only
  '';
in
pkgs.stdenvNoCC.mkDerivation {
  inherit pname version;
  src = workspaceRoot;
  inherit pnpmDeps;

  nativeBuildInputs = pnpmNativeBuildInputs;

  buildPhase = ''
    runHook preBuild
    ${buildBundle}
    runHook postBuild
  '';

  installPhase = ''
    runHook preInstall
    mkdir -p "$out"
    cp -r packages/vite-plugin-typst/dist "$out/dist"
    runHook postInstall
  '';
}
