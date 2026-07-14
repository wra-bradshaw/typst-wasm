{ ... }:
{
  perSystem =
    { pkgs, ... }:
    let
      docs = pkgs.callPackage ./package.nix { };
    in
    {
      packages.docs = docs;
      devShells.docs = pkgs.mkShell {
        packages = with pkgs; [
          nodejs
          pnpm
        ];
      };
    };
}
