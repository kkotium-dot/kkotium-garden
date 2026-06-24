#!/usr/bin/env bash
# ============================================================================
# SECRETS-GUARD (#156) — install the repo's git hooks into .git/hooks.
# Run once per clone:  bash scripts/install-git-hooks.sh
# ----------------------------------------------------------------------------
set -euo pipefail

root="$(git rev-parse --show-toplevel)"
src="$root/scripts/git-hooks/pre-commit"
dst="$root/.git/hooks/pre-commit"

if [ ! -f "$src" ]; then
  echo "[install-git-hooks] error: $src not found" >&2
  exit 1
fi

cp "$src" "$dst"
chmod +x "$dst"
echo "[install-git-hooks] pre-commit hook installed -> $dst"
echo "[install-git-hooks] test: 'git commit' will now block secrets + env/backup files."
