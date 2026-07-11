{
  pkgs,
  engineWasm,
  fonts,
  typstWasm,
  vitePluginTypst,
}:

let
  workspaceRoot = ../..;
  pname = "example-typst-blog";
  packageDir = "packages/example-typst-blog";
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

  buildBundle = ''
    pnpm --dir ${packageDir} exec vite build
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
    {
      packageDir = "packages/vite-plugin-typst";
      derivation = vitePluginTypst;
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

    ${buildBundle}
    runHook postBuild
  '';

  installPhase = ''
    runHook preInstall
    mkdir -p "$out"
    cp -r packages/example-typst-blog/dist "$out/dist"
    runHook postInstall
  '';
}
