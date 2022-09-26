# this file installs a reasonable development environment
# see https://gist.github.com/michaelglass/6d1af2cc869268fa7a17820b72ca7e48
# for simple nix setup instructions
{
  description = "RWX.com dev env";

  inputs.flake-utils.url = "github:numtide/flake-utils";
  inputs.nixpkgs.url = "github:nixos/nixpkgs/nixos-22.05";

  outputs =
    { self
    , nixpkgs
    , flake-utils
    }:
    flake-utils.lib.eachDefaultSystem (system:
    let
      pkgs = import nixpkgs { system = system; };
      mayNeedRosetta = pkgs.stdenv.isDarwin && pkgs.stdenv.isAarch64;
      rosettaArch = "x86_64-darwin";
    in
    {
      devShell = pkgs.mkShell {
        packages = with pkgs; [
          nixfmt # formatting _this file!_
          nodejs # locked to 16.16.0
        ];
      };
    });
}
