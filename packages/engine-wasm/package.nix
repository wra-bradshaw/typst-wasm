{
  craneLib,
  pkgs,
  rustSrc,
  rustToolchain,
}:

let
  lib = pkgs.lib;
  stdenv = pkgs.stdenv;
  rustPlatform = pkgs.makeRustPlatform {
    cargo = rustToolchain;
    rustc = rustToolchain;
  };
  src = craneLib.cleanCargoSource ./.;
  baseVendorDir = craneLib.vendorCargoDeps { inherit src; };

  cargoVendorDir = pkgs.runCommand "typst-wasm-wasm-cargo-vendor" { } ''
    mkdir -p "$out"

    vendor_subdir="$(sed -n 's|^directory = ".*/\([^"]*\)"$|\1|p' ${baseVendorDir}/config.toml)"
    mkdir -p "$out/$vendor_subdir"
    cp -R ${baseVendorDir}/"$vendor_subdir"/. "$out/$vendor_subdir/"
    chmod -R u+w "$out"

    rust_vendor_dir=${
      rustPlatform.fetchCargoVendor {
        src = rustSrc;
        cargoRoot = "lib/rustlib/src/rust/library";
        name = "typst-wasm-rust-std-vendor";
        hash = "sha256-5oJ/mtsJW0R3F7jgxafP23+WMLkyMKu10De5WIzb7Ro=";
      }
    }

    for dependency in "$rust_vendor_dir"/*; do
      dependency_name="$(basename "$dependency")"
      if [ ! -e "$out/$vendor_subdir/$dependency_name" ]; then
        cp -R "$dependency" "$out/$vendor_subdir/$dependency_name"
      fi
    done

    sed "s|${baseVendorDir}|$out|g" ${baseVendorDir}/config.toml > "$out/config.toml"
  '';

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
      "link-arg=-zstack-size=2097152"
      "-C"
      "link-arg=--max-memory=268435456"
    ];

    nativeBuildInputs =
      with pkgs;
      [
        rustToolchain
        binaryen
        nodejs_25
        wasm-bindgen-cli_0_2_108
      ]
      ++ (lib.optionals stdenv.isDarwin [
        apple-sdk
        libiconv
      ]);
  };

  cargoArtifacts = craneLib.buildDepsOnly commonArgs;
in
craneLib.buildPackage (
  commonArgs
  // {
    inherit cargoArtifacts;

    cargoBuildCommand = "cargo build --profile release";

    installPhaseCommand = ''
      mkdir -p "$out"

      wasm-bindgen \
        --target web \
        --out-dir "$out" \
        "$CARGO_TARGET_DIR/$CARGO_BUILD_TARGET/release/typst_wasm.wasm"

      wasm-opt -O4 "$out/typst_wasm_bg.wasm" -o "$out/typst_wasm_bg.wasm"

      WASM_OUTPUT_DIR="$out" node ${./scripts/patch-wasm-bindgen.js}
    '';
  }
)
