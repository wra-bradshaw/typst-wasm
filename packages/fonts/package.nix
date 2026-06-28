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
pkgs.stdenvNoCC.mkDerivation (finalAttrs: {
  pname = "typst-wasm-fonts";
  inherit version;

  dontUnpack = true;

  installPhase = ''
    runHook preInstall

    mkdir -p "$out/files"
    for font_file in ${builtins.concatStringsSep " " fontFiles}; do
      cp ${fontSource}/otf/$font_file "$out/files/$font_file"
    done

    runHook postInstall
  '';

  passthru.npmPackage = pkgs.stdenvNoCC.mkDerivation {
    pname = "typst-wasm-fonts-npm-package";
    version = finalAttrs.version;

    dontUnpack = true;

    installPhase = ''
      runHook preInstall

      mkdir -p "$out/dist"
      cp ${./package.json} "$out/package.json"
      cp ${./index.js} "$out/index.js"
      cp ${./index.d.ts} "$out/index.d.ts"
      cp -R ${finalAttrs.finalPackage}/files "$out/dist/files"

      runHook postInstall
    '';
  };
})
