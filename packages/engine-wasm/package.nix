{
  craneLib,
  pkgs,
  rustSrc,
  rustToolchain,
}:

let
  lib = pkgs.lib;
  stdenv = pkgs.stdenv;
  packageVersion = (builtins.fromJSON (builtins.readFile ./package.json)).version;
  cacheVersion = "0.0.0+nix-cache";
  tomlFormat = pkgs.formats.toml { };
  cargoToml = builtins.fromTOML (builtins.readFile ./Cargo.toml);
  cargoLock = builtins.fromTOML (builtins.readFile ./Cargo.lock);
  normalizedCargoToml = tomlFormat.generate "Cargo.toml" (
    lib.recursiveUpdate cargoToml { package.version = cacheVersion; }
  );
  normalizedCargoLock = tomlFormat.generate "Cargo.lock" (
    cargoLock
    // {
      package = map (
        package:
        if package.name == cargoToml.package.name && !(package ? source) then
          package // { version = cacheVersion; }
        else
          package
      ) cargoLock.package;
    }
  );
  sourceWithoutVersionedManifests = lib.cleanSourceWith {
    src = lib.cleanSource ./.;
    name = "typst-wasm-engine-wasm-source";
    filter =
      path: type:
      let
        base = baseNameOf path;
      in
      craneLib.filterCargoSources path type && base != "Cargo.toml" && base != "Cargo.lock";
  };
  src = pkgs.runCommand "typst-wasm-engine-wasm-cache-src" { } ''
    cp -R --no-preserve=mode,ownership ${sourceWithoutVersionedManifests}/. "$out"
    cp ${normalizedCargoToml} "$out/Cargo.toml"
    cp ${normalizedCargoLock} "$out/Cargo.lock"
  '';
  cargoVendorDir = craneLib.vendorMultipleCargoDeps {
    inherit (craneLib.findCargoFiles src) cargoConfigs;

    cargoLockList = [
      normalizedCargoLock
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
        nodejs_26
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
          --target web \
          --out-dir "$out/dist" \
          "$CARGO_TARGET_DIR/$CARGO_BUILD_TARGET/release/typst_wasm.wasm"

        wasm-opt -O4 "$out/dist/typst_wasm_bg.wasm" -o "$out/dist/typst_wasm_bg.wasm"

        WASM_OUTPUT_DIR="$out/dist" node ${./scripts/patch-wasm-bindgen.js}
      '';
    }
  );
in
pkgs.stdenvNoCC.mkDerivation {
  pname = "typst-wasm-engine-wasm-npm-package";
  version = packageVersion;

  dontUnpack = true;

  installPhase = ''
    runHook preInstall

    mkdir -p "$out"
    cp ${./package.json} "$out/package.json"
    cp ${./index.js} "$out/index.js"
    cp ${./index.d.ts} "$out/index.d.ts"
    cp -R ${wasmArtifacts}/dist "$out/dist"

    runHook postInstall
  '';

  passthru = {
    inherit cargoArtifacts wasmArtifacts;
  };
}
