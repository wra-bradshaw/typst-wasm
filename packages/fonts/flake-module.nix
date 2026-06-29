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
    };
}
