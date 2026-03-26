{
  pkgs,
  fonts,
  wasm,
}:

pkgs.buildNpmPackage {
  pname = "typst-wasm";
  version = "0.1.0";
  src = ./.;

  npmDepsHash = "sha256-u5w0eRi3mc3uCjBxCk0MdmRFXvmGok8Ejzl8vuqIAEY=";
  npmDepsFetcherVersion = 2;

  nativeBuildInputs = [ pkgs.bun ];

  postPatch = ''
    rm -rf src/fonts src/wasm
    ln -s ${fonts} src/fonts
    ln -s ${wasm} src/wasm
  '';

  npmBuildScript = "build";

  installPhase = ''
    runHook preInstall

    mkdir -p "$out"
    cp -r dist "$out/dist"
    cp package.json "$out/package.json"

    runHook postInstall
  '';
}
