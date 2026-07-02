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
  src = lib.cleanSourceWith {
    src = lib.cleanSource ./.;
    filter = path: type: craneLib.filterCargoSources path type;
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
    cargoExtraArgs = "--target wasm32-unknown-unknown -Z build-std=std,panic_abort";
    CARGO_BUILD_TARGET = "wasm32-unknown-unknown";
    CARGO_TARGET_DIR = "$TMPDIR/typst-wasm-target";
    RUSTFLAGS = lib.concatStringsSep " " [
      "-C"
      "target-feature=+atomics,+bulk-memory,+mutable-globals"
      "-C"
      "link-arg=--shared-memory"
      "-C"
      "link-arg=--import-memory"
      "-C"
      "link-arg=--export=__wasm_init_tls"
      "-C"
      "link-arg=--export=__tls_size"
      "-C"
      "link-arg=--export=__tls_align"
      "-C"
      "link-arg=--export=__tls_base"
      "-C"
      "link-arg=--export=__heap_base"
      "-C"
      "link-arg=-zstack-size=2097152"
      "-C"
      "link-arg=--max-memory=268435456"
    ];

    nativeBuildInputs =
      with pkgs;
      [
        rustToolchain
        binaryen
        nodejs
        wasm-bindgen-cli_0_2_121
      ]
      ++ (lib.optionals stdenv.isDarwin [
        apple-sdk
        libiconv
      ]);
  };

  cargoArtifacts = craneLib.buildDepsOnly commonArgs;

  wasmArtifacts = craneLib.buildPackage (
    commonArgs
    // {
      inherit cargoArtifacts;

      installPhaseCommand = ''
        mkdir -p "$out/dist"

        wasm-bindgen \
          --target bundler \
          --out-dir "$out/dist" \
          "$CARGO_TARGET_DIR/$CARGO_BUILD_TARGET/release/typst_wasm.wasm"

        wasm-opt \
          -Oz \
          --enable-threads \
          --enable-bulk-memory \
          --enable-mutable-globals \
          --enable-nontrapping-float-to-int \
          "$out/dist/typst_wasm_bg.wasm" \
          -o "$out/dist/typst_wasm_bg.wasm"
      '';
    }
  );

  pnpmDeps = import ../../nix/pnpm-deps.nix { inherit pkgs workspaceRoot; };

  bridgeArtifacts = pkgs.stdenvNoCC.mkDerivation {
    pname = "typst-wasm-engine-wasm-bridge";
    version = packageVersion;
    src = workspaceRoot;
    inherit pnpmDeps;
    nativeBuildInputs = [
      pkgs.nodejs
      pkgs.pnpmConfigHook
      pkgs.pnpm
    ];

    buildPhase = ''
      runHook preBuild

      pnpm --dir packages/engine-wasm exec tsdown

      runHook postBuild
    '';

    installPhase = ''
      runHook preInstall

      mkdir -p "$out"
      cp -R packages/engine-wasm/dist "$out/dist"

      runHook postInstall
    '';
  };
in
pkgs.stdenvNoCC.mkDerivation {
  pname = "typst-wasm-engine-wasm-artifacts";
  version = packageVersion;

  dontUnpack = true;

  installPhase = ''
    runHook preInstall

    mkdir -p "$out/dist"
    cp -R ${wasmArtifacts}/dist/. "$out/dist"
    cp -R ${bridgeArtifacts}/dist/. "$out/dist"

    runHook postInstall
  '';
}
