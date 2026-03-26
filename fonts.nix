{ pkgs }:

let
  version = "7.1.1";
  fontSource = pkgs.fetchzip {
    url = "https://download.gnu.org.ua/release/newcm/newcm-${version}.txz";
    hash = "sha256-js0AaEUe4WRPoWZloH33ahNxbl+PUcV36M3oAFN2gtQ=";
    stripRoot = true;
  };
  fontFiles = [
    "NewCMMath-Regular.otf"
    "NewCMMath-Bold.otf"
    "NewCMMath-Book.otf"
  ];
in
pkgs.stdenvNoCC.mkDerivation {
  pname = "typst-wasm-fonts";
  inherit version;

  dontUnpack = true;

  installPhase = ''
    runHook preInstall

    mkdir -p "$out/files"
    for font_file in ${builtins.concatStringsSep " " fontFiles}; do
      cp ${fontSource}/otf/$font_file "$out/files/$font_file"
    done

    FONT_OUTPUT_DIR="$out" ${pkgs.bun}/bin/bun ${./scripts/generate-font-index.ts}

    runHook postInstall
  '';
}
