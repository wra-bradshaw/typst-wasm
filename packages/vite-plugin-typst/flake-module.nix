{ ... }:
{
  perSystem =
    { pkgs, ... }:
    let
      vite-plugin-typst = pkgs.callPackage ./package.nix {
        nativeBuildInputs = with pkgs; [
          nodejs
          pnpm
        ];
      };
    in
    {
      packages.vite-plugin-typst = vite-plugin-typst;
      checks.vite-plugin-typst-lint = vite-plugin-typst.passthru.tests.lint;
      checks.vite-plugin-typst-unit = vite-plugin-typst.passthru.tests.unit;

      devShells.vite-plugin-typst = pkgs.mkShell {
        packages = with pkgs; [
          nodejs
          pnpm
        ];
        shellHook = "";
      };
    };
}
