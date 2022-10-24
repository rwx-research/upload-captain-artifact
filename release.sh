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
package_version="$(jq -r .version <package.json)"
latest_tag="$(git tag | grep "^v" | sort | tail -n 1)"
IFS=. read major minor patch <<<"${package_version}"

if [ "v$package_version" == $latest_tag ]; then
  echo "current version is $package_version"
  PS3='what version would you like to update?: '
  next_patch="$major.$minor.$(($patch + 1))"
  patch_msg="patch (bug fixes or improvements) $next_patch"
  next_minor="$major.$(($minor + 1)).$patch"
  minor_msg="minor (enhancements) $next_minor"
  next_major="$(($major + 1)).$minor.$patch"
  major_msg="major (breaking changes) $next_major"
  options=("$patch_msg" "$minor_msg" "$major_msg")
  select opt in "${options[@]}"; do
    case $opt in
    "$patch_msg")
      bump_version="patch"
      next_version=$next_patch
      break
      ;;
    "$minor_msg")
      bump_version="minor"
      next_version=$next_minor
      break
      ;;
    "$major_msg")
      bump_version="major"
      next_version=$next_major
      break
      ;;
    *) echo "invalid option $REPLY" ;;
    esac
  done

  npm version --no-git-tag-version "$bump_version"
  git checkout -b release-$next_version
  git commit -m "bump version to $next_version"
  gh pr create --title "prepare release v$next_version" --fill
  git checkout v1
  echo "✅ Please merge the v1 branch and call this script again"
  exit 0
fi

# 2. Create github release with new tag
