{ pkgs }:

let
  toolchain = pkgs.fenix.combine [
    (pkgs.fenix.complete.withComponents [
      "cargo"
      "llvm-tools-preview"
      "rust-src"
      "rustc"
    ])
    pkgs.fenix.targets.wasm32-unknown-unknown.latest.rust-std
  ];
  rustPlatform = pkgs.makeRustPlatform {
    cargo = toolchain;
    rustc = toolchain;
  };
  cargoDeps = pkgs.runCommand "typst-wasm-wasm-0.1.0-cargo-deps" { } ''
    mkdir -p "$out"
    cp -R ${
      rustPlatform.fetchCargoVendor {
        src = pkgs.fenix.complete."rust-src";
        cargoRoot = "lib/rustlib/src/rust/library";
        name = "typst-wasm-rust-std-vendor";
        hash = "sha256-5oJ/mtsJW0R3F7jgxafP23+WMLkyMKu10De5WIzb7Ro=";
      }
    }/. "$out/"
    chmod -R u+w "$out"
    cp -R ${
      rustPlatform.fetchCargoVendor {
        src = ./packages/engine-wasm;
        pname = "typst-wasm-wasm";
        version = "0.1.0";
        hash = "sha256-SdQoOxXZRMKr+XUcTHreBWDnBJL4xZjgbgkIa31nSiM=";
      }
    }/. "$out/"
  '';
in
rustPlatform.buildRustPackage {
  pname = "typst-wasm-wasm";
  version = "0.1.0";
  inherit cargoDeps;
  src = ./packages/engine-wasm;

  doCheck = false;
  dontCargoInstall = true;

  nativeBuildInputs =
    with pkgs;
    [
      binaryen
      lld
      pkg-config
      wasm-bindgen-cli_0_2_108
      wasm-pack
      writableTmpDirAsHomeHook
    ]
    ++ (lib.optionals stdenv.isDarwin [
      apple-sdk
      libiconv
    ]);

  buildPhase = ''
    runHook preBuild

    mkdir -p "$out"

    wasm-pack build \
      --mode no-install \
      --release \
      --target web \
      --out-dir "$out" \
      . \
      -- \
      --target-dir "$TMPDIR/typst-wasm-target" \
      -Z build-std=std,panic_abort

    WASM_OUTPUT_DIR="$out" ${pkgs.bun}/bin/bun ${./packages/engine-wasm/scripts/patch-wasm-bindgen.ts}

    runHook postBuild
  '';
}
