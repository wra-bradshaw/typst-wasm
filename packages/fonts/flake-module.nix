{ ... }:
{
  perSystem =
    {
      pkgs,
      ...
    }:
    let
      fonts = pkgs.callPackage ./package.nix { };
    in
    {
      packages.fonts = fonts;

      devShells.fonts = pkgs.mkShell {
        packages = [ pkgs.nodejs_25 ];
        shellHook = "";
      };
    };
}
