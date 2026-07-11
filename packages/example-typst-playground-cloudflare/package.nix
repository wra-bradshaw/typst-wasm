{
  pkgs,
  engineWasm,
  fonts,
  typstWasm,
}:

let
  workspaceRoot = ../..;
  pname = "example-typst-playground-cloudflare";
  packageDir = "packages/example-typst-playground-cloudflare";
  version = (builtins.fromJSON (builtins.readFile ./package.json)).version;
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
  inherit src pnpmDeps;

  nativeBuildInputs = pnpmNativeBuildInputs;

  buildPhase = ''
    runHook preBuild

    ${prepareBuildArtifacts}

    pnpm --dir ${packageDir} exec vite build

    runHook postBuild
  '';

  installPhase = ''
    runHook preInstall
    mkdir -p "$out"
    cp -r packages/example-typst-playground-cloudflare/dist "$out/dist"
    runHook postInstall
  '';
}
