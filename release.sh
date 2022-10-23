#!/bin/bash
set -Eeuo pipefail

# 0. Check that there's no changes and that we're on the v1 branch
if [ -n "$(git status --porcelain)" ]; then
  echo "please commit or stash changes before trying to create a new release"
  exit 1
fi

if [ "$(git branch --show-current)" != "v1" ]; then
  echo "You can only release this action from the v1 branch"
  exit 1
fi

echo "⭕️ finding location of github CLI:"
if ! which gh; then
  echo "❌ couldn't find github CLI... installing from homebrew"
  brew install gh
else
  echo "✅ found github CLI!"
fi

echo "⭕️ finding location of jq:"
if ! which jq; then
  echo "couldn't find jq... installing from homebrew"
  brew install jq
else
  echo "✅ found jq!"
fi

echo "⭕️ checking github CLI auth status:"
if ! gh auth status; then
  echo "you need to be logged into github with the github cli tool to run this script"
  gh auth login
fi

# 1. if package.json is the same as the latest tag, update package.json & create PR
package_version="$(jq <package.json .version)"
latest_tag="$(git tag | grep "^v" | sort | tail -n 1])"

if [ $package_version == $latest_tag ]; then
  echo "what version do you want to update?"
  PS3='what version would you like to update?: '
  patch="bug fixes or improvements, 0.0.1 -> 0.0.2"
  minor="enhancements, 0.0.0 -> 0.1.0"
  major="breaking changes, 0.0.0 -> 1.0.0"
  options=("$patch" "$minor" "$major" "Quit")
  select opt in "${options[@]}"; do
    case $opt in
    "$patch")
      echo "you chose choice 1"
      ;;
    "$minor")
      echo "you chose choice 2"
      ;;
    "$major")
      echo "you chose choice $REPLY which is $opt"
      ;;
    "Quit")
      break
      ;;
    *) echo "invalid option $REPLY" ;;
    esac
  done
fi

# 2. Create github release with new tag
