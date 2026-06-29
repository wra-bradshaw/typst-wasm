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
  version = (builtins.fromJSON (builtins.readFile ./package.json)).version;
  packageDir = "packages/typst-wasm";

  pnpmDeps = pkgs.fetchPnpmDeps {
    inherit pname;
    version = "deps";
    src = workspaceRoot;
    pnpm = pkgs.pnpm;
    fetcherVersion = 3;
    hash = pkgs.lib.fakeHash;
  };

  pnpmNativeBuildInputs = nativeBuildInputs ++ [
    pkgs.jq
    pkgs.nodejs
    pkgs.pnpmConfigHook
    pkgs.pnpm
  ];

  prepareBuildArtifacts = ''
    mkdir -p packages/fonts/dist packages/engine-wasm/dist
    cp -R ${fonts}/dist/files packages/fonts/dist/files
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
        ${lib.optionalString needsBuildArtifacts buildBundle}

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

    ${prepareBuildArtifacts}

    ${buildBundle}

    runHook postBuild
  '';

  installPhase = ''
    runHook preInstall

    mkdir -p "$out"
    cp -r packages/typst-wasm/dist "$out/dist"
    jq \
      --arg version "${version}" \
      '.dependencies["@typst-wasm/engine-wasm"] = $version | .dependencies["@typst-wasm/fonts"] = $version' \
      packages/typst-wasm/package.json > "$out/package.json"

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
