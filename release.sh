#!/bin/bash
set -Eeuo pipefail

# 0. Check that there's no changes and that we're on the v1 branch
if [ ! -z "$(git status --porcelain)" ]; then
  echo "not empty"
else

  echo "empty"
fi

# 1.
# update package.json & create PR

#
# 2. Create github release with new tag
