{
  pkgs,
  fonts,
  wasm,
}:

pkgs.buildNpmPackage {
  pname = "typst-wasm";
  version = "0.1.0";
  src = ./.;

  npmDepsHash = "sha256-qOOSAHDIuLsgs50LIBfbyKHthnXauecWxtsWo1My6kU=";

  nativeBuildInputs = [ pkgs.bun ];

  buildPhase = ''
    runHook preBuild

    mkdir -p packages/fonts/dist packages/engine-wasm/dist
    cp -R ${fonts}/files packages/fonts/dist/files
    cp -R ${wasm}/. packages/engine-wasm/dist

    npm run build --workspace packages/typst-wasm

    runHook postBuild
  '';

  installPhase = ''
    runHook preInstall

    mkdir -p "$out"
    cp -r packages/typst-wasm/dist "$out/dist"
    cp packages/typst-wasm/package.json "$out/package.json"

    runHook postInstall
  '';
}
