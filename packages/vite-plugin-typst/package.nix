{
  pkgs,
  nativeBuildInputs ? [ ],
}:

let
  workspaceRoot = ../..;
  pname = "vite-plugin-typst";
  pnpmWorkspaceName = "@typst-wasm/vite-plugin-typst";
  version = (builtins.fromJSON (builtins.readFile ./package.json)).version;
  pnpmDeps = import ../../nix/pnpm-deps.nix { inherit pkgs workspaceRoot; };

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
