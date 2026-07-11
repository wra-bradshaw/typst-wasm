{
  craneLib,
  pkgs,
  rustSrc,
  rustToolchain,
}:

let
  lib = pkgs.lib;
  stdenv = pkgs.stdenv;

  workspaceRoot = ../..;
  packageVersion = (builtins.fromJSON (builtins.readFile ./package.json)).version;

  wasmTarget = "wasm32-unknown-unknown";
  wasmFileName = "typst_engine.wasm";

  src = lib.cleanSourceWith {
    src = lib.cleanSource ./.;
    filter = path: type: craneLib.filterCargoSources path type || lib.hasSuffix ".wit" (toString path);
  };

  cargoVendorDir = craneLib.vendorMultipleCargoDeps {
    inherit (craneLib.findCargoFiles src) cargoConfigs;

    cargoLockList = [
      ./Cargo.lock
      "${rustSrc}/lib/rustlib/src/rust/library/Cargo.lock"
    ];
  };

  commonArgs = {
    pname = "typst-wasm-engine-wasm";
    version = "cache";

    inherit cargoVendorDir src;

    strictDeps = true;
    doCheck = false;

    cargoBuildCommand = "cargo build --profile release";
    cargoExtraArgs = "--target ${wasmTarget}";

    CARGO_BUILD_TARGET = wasmTarget;
    CARGO_TARGET_DIR = "$TMPDIR/typst-wasm-target";

    nativeBuildInputs = [
      rustToolchain
      pkgs.wasm-tools
    ]
    ++ lib.optionals stdenv.isDarwin [
      pkgs.apple-sdk
      pkgs.libiconv
    ];
  };

  cargoArtifacts = craneLib.buildDepsOnly commonArgs;

  wasmArtifacts = craneLib.buildPackage (
    commonArgs
    // {
      pname = "typst-wasm-engine-wasm-component";
      version = packageVersion;

      inherit cargoArtifacts;

      installPhaseCommand = ''
        runHook preInstall

        mkdir -p "$out"
        wasm-tools component new \
          "$CARGO_TARGET_DIR/$CARGO_BUILD_TARGET/release/${wasmFileName}" \
          -o "$out/component.wasm"

        runHook postInstall
      '';
    }
  );

  packageDir = "packages/engine-wasm";
  pnpmDeps = import ../../nix/pnpm-deps.nix {
    inherit pkgs workspaceRoot;
  };
  pnpmSrc = import ../../nix/workspace-source.nix {
    inherit (pkgs) lib;
    inherit workspaceRoot packageDir;
  };
in
pkgs.stdenvNoCC.mkDerivation {
  pname = "typst-wasm-engine-wasm-artifacts";
  version = packageVersion;

  src = pnpmSrc;

  inherit pnpmDeps;

  nativeBuildInputs = [
    pkgs.nodejs
    pkgs.pnpmConfigHook
    pkgs.pnpm
  ];

  buildPhase = ''
    runHook preBuild

    export COMPONENT_PATH="${wasmArtifacts}/component.wasm"
    export OUT_DIR="$PWD/packages/engine-wasm/dist"

    pnpm --dir packages/engine-wasm transpile worker
    pnpm --dir packages/engine-wasm transpile jspi

    runHook postBuild
  '';

  installPhase = ''
    runHook preInstall

    mkdir -p "$out/dist"

    cp "${wasmArtifacts}/component.wasm" "$out/dist/component.wasm"
    cp -R packages/engine-wasm/dist/. "$out/dist/"

    runHook postInstall
  '';
}
