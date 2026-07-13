{
  pkgs,
  typstAssets,
}:

let
  version = (builtins.fromJSON (builtins.readFile ./package.json)).version;
  fontFiles = [
    "LibertinusSerif-Regular.otf"
    "LibertinusSerif-Semibold.otf"
    "LibertinusSerif-Bold.otf"
    "LibertinusSerif-Italic.otf"
    "LibertinusSerif-SemiboldItalic.otf"
    "LibertinusSerif-BoldItalic.otf"
    "NewCM10-Regular.otf"
    "NewCM10-Bold.otf"
    "NewCM10-Italic.otf"
    "NewCM10-BoldItalic.otf"
    "NewCMMath-Regular.otf"
    "NewCMMath-Book.otf"
    "NewCMMath-Bold.otf"
    "DejaVuSansMono.ttf"
    "DejaVuSansMono-Bold.ttf"
    "DejaVuSansMono-Oblique.ttf"
    "DejaVuSansMono-BoldOblique.ttf"
  ];
in
pkgs.stdenvNoCC.mkDerivation {
  pname = "typst-wasm-fonts-artifacts";
  inherit version;

  dontUnpack = true;

  installPhase = ''
    runHook preInstall

    mkdir -p "$out/dist/files"
    for font_file in ${builtins.concatStringsSep " " fontFiles}; do
      cp ${typstAssets}/files/fonts/$font_file "$out/dist/files/$font_file"
    done
    cp ${typstAssets}/NOTICE "$out/dist/NOTICE"

    runHook postInstall
  '';
}
