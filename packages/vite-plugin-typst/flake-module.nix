{ ... }:
{
  perSystem =
    { pkgs, ... }:
    let
      vite-plugin-typst = pkgs.callPackage ./package.nix { };
    in
    {
      packages.vite-plugin-typst = vite-plugin-typst;

      devShells.vite-plugin-typst = pkgs.mkShell {
        packages = with pkgs; [
          nodejs
          pnpm
        ];
        shellHook = "";
      };
    };
}
