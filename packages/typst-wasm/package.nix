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
    hash = "sha256-vK/ELi3zPs2QGihaZmx5uzmf31ac1YKeiDO+NzSkwpA=";
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

  lintCommand = "pnpm exec eslint src --max-warnings=0";
  unitCommand = "pnpm exec vitest run";
  nodeE2eCommand = "pnpm exec vitest run -c vitest.e2e.config.ts";
  bunE2eCommand = "bun test ./tests/e2e/bun.e2e.ts";
  denoE2eCommand = "deno test --allow-read --allow-net tests/e2e/deno.e2e.ts";

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
      command = ''
        cd ${packageDir}
        ${lintCommand}
      '';
    };
    unit = mkWorkspaceCheck {
      name = "unit";
      command = ''
        cd ${packageDir}
        ${unitCommand}
      '';
    };
    e2e-node = mkWorkspaceCheck {
      name = "e2e-node";
      needsBuildArtifacts = true;
      command = ''
        ${buildBundle}
        cd ${packageDir}
        ${nodeE2eCommand}
      '';
    };
    e2e-bun = mkWorkspaceCheck {
      name = "e2e-bun";
      needsBuildArtifacts = true;
      command = ''
        ${buildBundle}
        cd ${packageDir}
        ${bunE2eCommand}
      '';
    };
    e2e-deno = mkWorkspaceCheck {
      name = "e2e-deno";
      needsBuildArtifacts = true;
      command = ''
        ${buildBundle}
        cd ${packageDir}
        ${denoE2eCommand}
      '';
    };
  };
}
