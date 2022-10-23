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

# 1.
# update package.json & create PR

#
# 2. Create github release with new tag
