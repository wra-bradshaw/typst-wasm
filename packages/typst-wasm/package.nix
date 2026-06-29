{
  pkgs,
  fonts,
  nativeBuildInputs ? [ ],
  wasm ? null,
}:

let
  lib = pkgs.lib;
  workspaceRoot = ../..;
  pname = "typst-wasm";
  version = (builtins.fromJSON (builtins.readFile ./package.json)).version;
  packageDir = "packages/typst-wasm";

  pnpmDeps = pkgs.fetchPnpmDeps {
    inherit pname;
    version = "deps";
    src = workspaceRoot;
    pnpm = pkgs.pnpm;
    pnpmWorkspaces = [ pname ];
    fetcherVersion = 3;
    hash = "sha256-DMxDsxE//esMOvOjEDM713FUV+0e3lIS0bxQ2ZlUm5o=";
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

  prepareWasmArtifacts = ''
    mkdir -p packages/engine-wasm/dist
    cp -R ${wasm}/dist/. packages/engine-wasm/dist
  '';

  buildBundle = ''
    pnpm --dir ${packageDir} exec tsdown
  '';

  mkWorkspaceCheck =
    {
      name,
      command,
      needsBuildArtifacts ? false,
      needsWasmArtifacts ? false,
    }:
    assert lib.assertMsg (
      !needsWasmArtifacts || wasm != null
    ) "typst-wasm check ${name} requires a wasm package";
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

        ${lib.optionalString needsBuildArtifacts prepareFontArtifacts}
        ${lib.optionalString needsWasmArtifacts prepareWasmArtifacts}
        ${lib.optionalString (needsBuildArtifacts || needsWasmArtifacts) buildBundle}

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
      needsWasmArtifacts = true;
      command = "pnpm run e2e:node";
    };
    e2e-bun = mkWorkspaceCheck {
      name = "e2e-bun";
      needsBuildArtifacts = true;
      needsWasmArtifacts = true;
      command = "pnpm run e2e:bun";
    };
    e2e-deno = mkWorkspaceCheck {
      name = "e2e-deno";
      needsBuildArtifacts = true;
      needsWasmArtifacts = true;
      command = "pnpm run e2e:deno";
    };
  };
}
