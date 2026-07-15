{
  craneLib,
  fonts,
  pkgs,
  rustToolchain,
  rustSrc,
}:

let
  lib = pkgs.lib;
  stdenv = pkgs.stdenv;
  workspaceRoot = ../..;
  pname = "typst-wasm";
  version = (builtins.fromJSON (builtins.readFile ./package.json)).version;
  packageDir = "packages/typst-wasm";
  wasmTarget = "wasm32-unknown-unknown";
  wasmFileName = "typst_engine.wasm";

  src = import ../../nix/workspace-source.nix {
    inherit (pkgs) lib;
    inherit workspaceRoot packageDir;
  };
  pnpmDeps = import ../../nix/pnpm-deps.nix { inherit pkgs workspaceRoot; };
  prepareWorkspaceArtifacts = import ../../nix/workspace-artifacts.nix { lib = pkgs.lib; };

  engineSrc = lib.cleanSourceWith {
    src = "${src}/${packageDir}/engine";
    filter = path: type: craneLib.filterCargoSources path type || lib.hasSuffix ".wit" (toString path);
  };

  cargoVendorDir = craneLib.vendorMultipleCargoDeps {
    inherit (craneLib.findCargoFiles engineSrc) cargoConfigs;
    cargoLockList = [
      ./engine/Cargo.lock
      "${rustSrc}/lib/rustlib/src/rust/library/Cargo.lock"
    ];
  };

  commonArgs = {
    pname = "typst-wasm-engine";
    version = "cache";
    inherit cargoVendorDir;
    src = engineSrc;
    strictDeps = true;
    doCheck = false;
    doInstallCargoArtifacts = false;
    cargoBuildCommand = "cargo build --profile release";
    cargoExtraArgs = "--target ${wasmTarget}";
    CARGO_BUILD_TARGET = wasmTarget;
    CARGO_TARGET_DIR = "$TMPDIR/typst-wasm-target";
    nativeBuildInputs = [ rustToolchain pkgs.wasm-tools ]
      ++ lib.optionals stdenv.isDarwin [ pkgs.apple-sdk pkgs.libiconv ];
  };

  cargoArtifacts = craneLib.buildDepsOnly commonArgs;
  wasmArtifacts = craneLib.buildPackage (commonArgs // {
    pname = "typst-wasm-engine-component";
    version = version;
    inherit cargoArtifacts;
    installPhaseCommand = ''
      runHook preInstall
      mkdir -p "$out"
      wasm-tools component new \
        "$CARGO_TARGET_DIR/$CARGO_BUILD_TARGET/release/${wasmFileName}" \
        -o "$out/component.wasm"
      runHook postInstall
    '';
  });

  prepareBuildArtifacts = prepareWorkspaceArtifacts [
    {
      packageDir = "packages/fonts";
      outputPath = "dist/files";
      derivation = fonts;
    }
  ];
in
pkgs.stdenvNoCC.mkDerivation {
  inherit pname version src pnpmDeps;
  nativeBuildInputs = [ pkgs.nodejs pkgs.pnpmConfigHook pkgs.pnpm ];

  buildPhase = ''
    runHook preBuild
    ${prepareBuildArtifacts}
    export COMPONENT_PATH="${wasmArtifacts}/component.wasm"
    pnpm --dir ${packageDir} transpile:engine:worker
    pnpm --dir ${packageDir} transpile:engine:jspi
    pnpm --dir ${packageDir} exec tsdown
    mkdir -p packages/typst-wasm/dist/engine
    cp -R packages/typst-wasm/src/engine/generated/. packages/typst-wasm/dist/engine/
    runHook postBuild
  '';

  installPhase = ''
    runHook preInstall
    mkdir -p "$out"
    cp -r packages/typst-wasm/dist "$out/dist"
    runHook postInstall
  '';
}
