{ inputs, ... }:
{
  perSystem =
    {
      pkgs,
      ...
    }:
    let
      fonts = pkgs.callPackage ./package.nix {
        typstAssets = inputs.typst-assets;
      };
    in
    {
      packages.fonts = fonts;
    };
}
