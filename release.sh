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

# 2. Create github release with new tag
