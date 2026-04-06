{
  pkgs,
  fonts,
  wasm,
  nativeBuildInputs ? [ ],
}:

let
  lib = pkgs.lib;
  workspaceRoot = ../..;
  pname = "typst-wasm";
  version = "0.1.0";
  packageDir = "packages/typst-wasm";

  pnpmDeps = pkgs.fetchPnpmDeps {
    inherit pname version;
    src = workspaceRoot;
    pnpm = pkgs.pnpm_10;
    fetcherVersion = 3;
    hash = "sha256-J/NwBgTuH0r99tiSjdxdNDim7ianQtVSqSy32T16BM4";
  };

  pnpmNativeBuildInputs = nativeBuildInputs ++ [
    pkgs.nodejs_25
    pkgs.pnpmConfigHook
    pkgs.pnpm_10
  ];

  prepareBuildArtifacts = ''
    mkdir -p packages/fonts/dist packages/engine-wasm/dist
    cp -R ${fonts}/files packages/fonts/dist/files
    cp -R ${wasm}/. packages/engine-wasm/dist
  '';

  buildBundle = ''
    pnpm --dir ${packageDir} exec tsdown
    mkdir -p ${packageDir}/dist
    cp packages/engine-wasm/dist/typst_wasm_bg.wasm ${packageDir}/dist/typst_wasm_bg.wasm
  '';

  mkWorkspaceCheck =
    {
      name,
      command,
      needsBuildArtifacts ? false,
    }:
    pkgs.stdenvNoCC.mkDerivation {
      pname = "typst-wasm-${name}";
      inherit version;
      src = workspaceRoot;
      inherit pnpmDeps;

      nativeBuildInputs = pnpmNativeBuildInputs;

      buildPhase = ''
        runHook preBuild

        export HOME="$TMPDIR/home"
        mkdir -p "$HOME"
        chmod -R u+w packages/fonts packages/engine-wasm packages/typst-wasm

        ${lib.optionalString needsBuildArtifacts prepareBuildArtifacts}
        cd ${packageDir}
        ${lib.optionalString needsBuildArtifacts buildBundle}

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

    ${prepareBuildArtifacts}

    ${buildBundle}

    runHook postBuild
  '';

  installPhase = ''
    runHook preInstall

    mkdir -p "$out"
    cp -r packages/typst-wasm/dist "$out/dist"
    cp packages/typst-wasm/package.json "$out/package.json"

    runHook postInstall
  '';

  passthru.tests = {
    lint = mkWorkspaceCheck {
      name = "lint";
      command = "pnpm exec eslint src --max-warnings=0";
    };
    unit = mkWorkspaceCheck {
      name = "unit";
      command = "pnpm exec vitest run";
    };
    e2e-node = mkWorkspaceCheck {
      name = "e2e-node";
      needsBuildArtifacts = true;
      command = "pnpm exec vitest run -c vitest.e2e.config.ts";
    };
    e2e-bun = mkWorkspaceCheck {
      name = "e2e-bun";
      needsBuildArtifacts = true;
      command = "bun test ./tests/e2e/bun.e2e.ts";
    };
    e2e-deno = mkWorkspaceCheck {
      name = "e2e-deno";
      needsBuildArtifacts = true;
      command = "deno test --allow-read --allow-net tests/e2e/deno.e2e.ts";
    };
  };
}
