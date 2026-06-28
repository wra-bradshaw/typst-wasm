{
  craneLib,
  pkgs,
  rustSrc,
  rustToolchain,
}:

let
  lib = pkgs.lib;
  stdenv = pkgs.stdenv;
  src = craneLib.cleanCargoSource ./.;
  cargoVendorDir = craneLib.vendorMultipleCargoDeps {
    inherit (craneLib.findCargoFiles src) cargoConfigs;

    cargoLockList = [
      ./Cargo.lock
      "${rustSrc}/lib/rustlib/src/rust/library/Cargo.lock"
    ];
  };

  commonArgs = {
    pname = "typst-wasm-wasm";
    version = "0.1.0";
    inherit cargoVendorDir src;
    strictDeps = true;
    doCheck = false;
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
        wasm-bindgen-cli_0_2_108
      ]
      ++ (lib.optionals stdenv.isDarwin [
        apple-sdk
        libiconv
      ]);
  };

in
craneLib.buildPackage (
  commonArgs
  // {
    pname = "typst-wasm-engine-wasm-npm-package";

    cargoBuildCommand = "cargo build --profile release";

    installPhaseCommand = ''
      mkdir -p "$out/dist"
      cp ${./package.json} "$out/package.json"
      cp ${./index.js} "$out/index.js"
      cp ${./index.d.ts} "$out/index.d.ts"

      wasm-bindgen \
        --target web \
        --out-dir "$out/dist" \
        "$CARGO_TARGET_DIR/$CARGO_BUILD_TARGET/release/typst_wasm.wasm"

      wasm-opt -O4 "$out/dist/typst_wasm_bg.wasm" -o "$out/dist/typst_wasm_bg.wasm"

      WASM_OUTPUT_DIR="$out/dist" node ${./scripts/patch-wasm-bindgen.js}
    '';
  }
)
