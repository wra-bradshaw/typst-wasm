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
      packages.publish-fonts = fonts;

      devShells.fonts = pkgs.mkShell {
        packages = [ pkgs.nodejs ];
        shellHook = "";
      };
    };
}
