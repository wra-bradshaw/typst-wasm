{ ... }:
{
  perSystem =
    { pkgs, ... }:
    let
      example-typst-blog = pkgs.callPackage ./package.nix {
        nativeBuildInputs = with pkgs; [
          nodejs
          pnpm
        ];
      };
    in
    {
      packages.example-typst-blog = example-typst-blog;

      devShells.example-typst-blog = pkgs.mkShell {
        packages = with pkgs; [
          nodejs
          pnpm
        ];
        shellHook = "";
      };
    };
}
