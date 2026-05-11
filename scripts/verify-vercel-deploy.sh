#!/usr/bin/env bash
# verify-vercel-deploy.sh — work principle #36 enforcer
#
# Verifies that the current HEAD commit has been deployed to Vercel production.
#
# Two verification paths (auto-selected):
#   1. Vercel API path  (preferred) — uses VERCEL_TOKEN. Reports real build state (READY/BUILDING/ERROR).
#   2. GitHub Deployments path (fallback) — uses gh CLI. Reports deployment registration only.
#
# Usage:
#   scripts/verify-vercel-deploy.sh            # check HEAD against latest production deployment
#   scripts/verify-vercel-deploy.sh --wait     # poll up to 180s until match (after push)
#
# Exit codes:
#   0 = HEAD SHA matches latest production deployment commit SHA
#   1 = mismatch (production is on a different commit — integration may be broken)
#   2 = no Vercel token AND no gh CLI / both APIs unreachable
#   3 = VERCEL_PROJECT_ID / VERCEL_ORG_ID missing (Vercel path only)
#
# Why webhook count is NOT checked anymore (work principle #36 e, 2026-05-12 refinement):
#   Vercel modern setups use GitHub App integration, NOT legacy webhooks.
#   `gh api repos/.../hooks` returns [] for GitHub App installs — false-positive risk.
#   The authoritative check is: latest production deployment SHA == HEAD SHA.

set -euo pipefail

WAIT_MODE=0
if [[ "${1:-}" == "--wait" ]]; then WAIT_MODE=1; fi

HEAD_SHA="$(git rev-parse HEAD)"
SHORT_HEAD="$(git rev-parse --short HEAD)"

# ---------------------------------------------------------------------------
# Path selection
# ---------------------------------------------------------------------------

USE_VERCEL_PATH=0
USE_GITHUB_PATH=0

if [[ -n "${VERCEL_TOKEN:-}" ]]; then
  USE_VERCEL_PATH=1
elif command -v gh >/dev/null 2>&1; then
  USE_GITHUB_PATH=1
else
  echo "[verify-deploy] neither VERCEL_TOKEN nor gh CLI available — cannot verify" >&2
  echo "[verify-deploy] either:" >&2
  echo "[verify-deploy]   - export VERCEL_TOKEN (https://vercel.com/account/tokens)" >&2
  echo "[verify-deploy]   - or install gh CLI and run 'gh auth login'" >&2
  exit 2
fi

# ---------------------------------------------------------------------------
# Vercel API path helpers (when VERCEL_TOKEN is set)
# ---------------------------------------------------------------------------

resolve_vercel_ids() {
  PROJECT_ID="${VERCEL_PROJECT_ID:-}"
  ORG_ID="${VERCEL_ORG_ID:-}"
  if [[ -z "$PROJECT_ID" || -z "$ORG_ID" ]]; then
    if [[ -f .vercel/project.json ]]; then
      PROJECT_ID="${PROJECT_ID:-$(jq -r '.projectId' .vercel/project.json)}"
      ORG_ID="${ORG_ID:-$(jq -r '.orgId' .vercel/project.json)}"
    fi
  fi
  if [[ -z "$PROJECT_ID" || -z "$ORG_ID" ]]; then
    echo "[verify-deploy] missing VERCEL_PROJECT_ID/VERCEL_ORG_ID and .vercel/project.json not readable" >&2
    exit 3
  fi
}

vercel_check_once() {
  local resp deploy_sha state
  resp="$(curl -fsS -H "Authorization: Bearer $VERCEL_TOKEN" \
    "https://api.vercel.com/v6/deployments?projectId=$PROJECT_ID&teamId=$ORG_ID&target=production&limit=1" 2>/dev/null || true)"
  if [[ -z "$resp" ]]; then echo "FAIL_API"; return; fi
  deploy_sha="$(echo "$resp" | jq -r '.deployments[0].meta.githubCommitSha // empty')"
  state="$(echo "$resp" | jq -r '.deployments[0].state // empty')"
  if [[ -z "$deploy_sha" ]]; then echo "NO_DEPLOY"; return; fi
  echo "${deploy_sha} ${state}"
}

# ---------------------------------------------------------------------------
# GitHub Deployments path helpers (when gh CLI is available)
# ---------------------------------------------------------------------------

resolve_repo_slug() {
  # Try gh's current repo detection first (works inside a clone)
  REPO_SLUG="$(gh repo view --json nameWithOwner --jq .nameWithOwner 2>/dev/null || true)"
  if [[ -z "$REPO_SLUG" ]]; then
    echo "[verify-deploy] cannot resolve GitHub repo slug — run inside a clone or set GH_REPO=owner/name" >&2
    exit 2
  fi
}

github_check_once() {
  local resp deploy_sha state
  resp="$(gh api "repos/$REPO_SLUG/deployments?environment=Production&per_page=1" 2>/dev/null || true)"
  if [[ -z "$resp" || "$resp" == "[]" ]]; then echo "NO_DEPLOY"; return; fi
  deploy_sha="$(echo "$resp" | jq -r '.[0].sha // empty')"
  if [[ -z "$deploy_sha" ]]; then echo "NO_DEPLOY"; return; fi
  # GitHub Deployments has its own status endpoint; treat presence as "registered"
  state="REGISTERED"
  echo "${deploy_sha} ${state}"
}

# ---------------------------------------------------------------------------
# Unified check
# ---------------------------------------------------------------------------

check_once() {
  if [[ $USE_VERCEL_PATH -eq 1 ]]; then
    vercel_check_once
  else
    github_check_once
  fi
}

# Initialize the selected path
if [[ $USE_VERCEL_PATH -eq 1 ]]; then
  resolve_vercel_ids
  ACTIVE_PATH="vercel-api"
else
  resolve_repo_slug
  ACTIVE_PATH="github-deployments"
fi

# ---------------------------------------------------------------------------
# Wait mode (poll up to 180s)
# ---------------------------------------------------------------------------

if [[ $WAIT_MODE -eq 1 ]]; then
  echo "[verify-deploy] polling ($ACTIVE_PATH) up to 180s for production deployment of $SHORT_HEAD..."
  END=$(( $(date +%s) + 180 ))
  while [[ $(date +%s) -lt $END ]]; do
    result=$(check_once)
    case "$result" in
      FAIL_API)
        echo "[verify-deploy] api error, retrying in 10s..." >&2
        sleep 10
        ;;
      NO_DEPLOY)
        echo "[verify-deploy] no production deployment found yet, retrying in 10s..." >&2
        sleep 10
        ;;
      *)
        deploy_sha="${result% *}"
        state="${result#* }"
        if [[ "$deploy_sha" == "$HEAD_SHA" ]]; then
          if [[ "$state" == "READY" || "$state" == "REGISTERED" ]]; then
            echo "[verify-deploy] OK ($ACTIVE_PATH) — production is on $SHORT_HEAD (state=$state)"
            exit 0
          fi
          echo "[verify-deploy] match found but state=$state, waiting for READY..."
          sleep 10
        else
          short_remote="${deploy_sha:0:7}"
          echo "[verify-deploy] still on $short_remote (state=$state), polling..."
          sleep 10
        fi
        ;;
    esac
  done
  echo "[verify-deploy] TIMEOUT after 180s — production did not pick up $SHORT_HEAD" >&2
  echo "[verify-deploy] Vercel git integration may be broken. checks to run:" >&2
  echo "[verify-deploy]   - gh api repos/<owner>/<repo>/deployments (recent prod deploys?)" >&2
  echo "[verify-deploy]   - Vercel dashboard: Settings -> Git -> Connect Git Repository" >&2
  exit 1
fi

# ---------------------------------------------------------------------------
# Single-shot mode
# ---------------------------------------------------------------------------

result=$(check_once)
case "$result" in
  FAIL_API)
    echo "[verify-deploy] cannot reach $ACTIVE_PATH API" >&2
    exit 2
    ;;
  NO_DEPLOY)
    echo "[verify-deploy] no production deployment found via $ACTIVE_PATH" >&2
    exit 1
    ;;
  *)
    deploy_sha="${result% *}"
    state="${result#* }"
    if [[ "$deploy_sha" == "$HEAD_SHA" ]]; then
      echo "[verify-deploy] OK ($ACTIVE_PATH) — production is on $SHORT_HEAD (state=$state)"
      exit 0
    else
      short_remote="${deploy_sha:0:7}"
      echo "[verify-deploy] MISMATCH ($ACTIVE_PATH) — HEAD=$SHORT_HEAD but production=$short_remote (state=$state)" >&2
      echo "[verify-deploy] Vercel git integration may be broken. checks to run:" >&2
      echo "[verify-deploy]   - gh api repos/<owner>/<repo>/deployments" >&2
      echo "[verify-deploy]   - Vercel dashboard: Settings -> Git -> Connect Git Repository" >&2
      exit 1
    fi
    ;;
esac
