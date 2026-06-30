{ pkgs, nativeBuildInputs ? [ ] }:

let
  lib = pkgs.lib;
  workspaceRoot = ../..;
  pname = "vite-plugin-typst";
  version = (builtins.fromJSON (builtins.readFile ./package.json)).version;
  packageDir = "packages/vite-plugin-typst";

  pnpmDeps = pkgs.fetchPnpmDeps {
    inherit pname;
    version = "deps";
    src = workspaceRoot;
    pnpm = pkgs.pnpm;
    pnpmWorkspaces = [ pname ];
    fetcherVersion = 3;
    hash = lib.fakeHash;
  };

  pnpmNativeBuildInputs = nativeBuildInputs ++ [
    pkgs.nodejs
    pkgs.pnpmConfigHook
    pkgs.pnpm
  ];

  buildBundle = ''
    pnpm --dir ${packageDir} exec tsdown
  '';

  mkWorkspaceCheck =
    {
      name,
      command,
    }:
    pkgs.stdenvNoCC.mkDerivation {
      pname = "vite-plugin-typst-${name}";
      inherit version;
      src = workspaceRoot;
      inherit pnpmDeps;

      nativeBuildInputs = pnpmNativeBuildInputs;

      buildPhase = ''
        runHook preBuild

        export HOME="$TMPDIR/home"
        mkdir -p "$HOME"
        chmod -R u+w packages/vite-plugin-typst

        cd ${packageDir}
        ${command}

        runHook postBuild
      '';

      installPhase = ''
        runHook preInstall
        mkdir -p "$out"
        runHook postInstall
      '';
    };
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

  passthru.tests = {
    lint = mkWorkspaceCheck {
      name = "lint";
      command = "pnpm exec eslint . --max-warnings=0";
    };
    unit = mkWorkspaceCheck {
      name = "unit";
      command = "pnpm exec vitest run";
    };
  };
}
