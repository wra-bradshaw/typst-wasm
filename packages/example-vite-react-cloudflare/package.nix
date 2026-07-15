{
  pkgs,
  fonts,
  typstWasm,
}:

let
  workspaceRoot = ../..;
  pname = "example-vite-react-cloudflare";
  packageDir = "packages/example-vite-react-cloudflare";
  version = (builtins.fromJSON (builtins.readFile ./package.json)).version;
  pnpmDeps = import ../../nix/pnpm-deps.nix { inherit pkgs workspaceRoot; };
  src = import ../../nix/workspace-source.nix {
    inherit (pkgs) lib;
    inherit workspaceRoot packageDir;
  };
  prepareWorkspaceArtifacts = import ../../nix/workspace-artifacts.nix { lib = pkgs.lib; };
  prepareBuildArtifacts = prepareWorkspaceArtifacts [
    { packageDir = "packages/fonts"; derivation = fonts; }
    { packageDir = "packages/typst-wasm"; derivation = typstWasm; }
  ];
in
pkgs.stdenvNoCC.mkDerivation {
  inherit pname version src pnpmDeps;
  nativeBuildInputs = [ pkgs.nodejs pkgs.pnpmConfigHook pkgs.pnpm ];

  buildPhase = ''
    runHook preBuild
    ${prepareBuildArtifacts}
    pnpm --dir ${packageDir} exec vite build
    runHook postBuild
  '';

  installPhase = ''
    runHook preInstall
    mkdir -p "$out"
    cp -r ${packageDir}/dist "$out/dist"
    runHook postInstall
  '';
}
