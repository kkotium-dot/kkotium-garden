#!/usr/bin/env bash
# verify-vercel-deploy.sh — work principle #36 enforcer
#
# Usage:
#   scripts/verify-vercel-deploy.sh            # check HEAD against latest Vercel deployment
#   scripts/verify-vercel-deploy.sh --wait     # poll up to 180s until match (after push)
#
# Exit codes:
#   0 = HEAD SHA matches latest production deployment commit SHA
#   1 = mismatch (production is on a different commit — webhook may be broken)
#   2 = no Vercel token / API unreachable (cannot verify)
#   3 = VERCEL_PROJECT_ID / VERCEL_ORG_ID missing
#
# Required env:
#   VERCEL_TOKEN — personal access token (https://vercel.com/account/tokens)
# Optional:
#   VERCEL_PROJECT_ID — defaults to .vercel/project.json "projectId"
#   VERCEL_ORG_ID     — defaults to .vercel/project.json "orgId"

set -euo pipefail

WAIT_MODE=0
if [[ "${1:-}" == "--wait" ]]; then WAIT_MODE=1; fi

# Resolve project + org IDs
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

if [[ -z "${VERCEL_TOKEN:-}" ]]; then
  echo "[verify-deploy] VERCEL_TOKEN not set — cannot call Vercel API" >&2
  echo "[verify-deploy] create one at https://vercel.com/account/tokens and export VERCEL_TOKEN=..." >&2
  exit 2
fi

HEAD_SHA="$(git rev-parse HEAD)"
SHORT_HEAD="$(git rev-parse --short HEAD)"

api_call() {
  curl -fsS -H "Authorization: Bearer $VERCEL_TOKEN" \
    "https://api.vercel.com/v6/deployments?projectId=$PROJECT_ID&teamId=$ORG_ID&target=production&limit=1" 2>/dev/null
}

check_once() {
  local resp deploy_sha state
  resp="$(api_call || true)"
  if [[ -z "$resp" ]]; then
    echo "FAIL_API"
    return
  fi
  deploy_sha="$(echo "$resp" | jq -r '.deployments[0].meta.githubCommitSha // empty')"
  state="$(echo "$resp" | jq -r '.deployments[0].state // empty')"
  if [[ -z "$deploy_sha" ]]; then
    echo "NO_DEPLOY"
    return
  fi
  echo "${deploy_sha} ${state}"
}

if [[ $WAIT_MODE -eq 1 ]]; then
  echo "[verify-deploy] polling Vercel up to 180s for production deployment of $SHORT_HEAD..."
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
          if [[ "$state" == "READY" ]]; then
            echo "[verify-deploy] OK — production is on $SHORT_HEAD (state=READY)"
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
  echo "[verify-deploy] webhook may be broken. check: gh api repos/<owner>/<repo>/hooks" >&2
  exit 1
fi

# single-shot mode
result=$(check_once)
case "$result" in
  FAIL_API)
    echo "[verify-deploy] cannot reach Vercel API" >&2
    exit 2
    ;;
  NO_DEPLOY)
    echo "[verify-deploy] no production deployment found for project" >&2
    exit 1
    ;;
  *)
    deploy_sha="${result% *}"
    state="${result#* }"
    if [[ "$deploy_sha" == "$HEAD_SHA" ]]; then
      echo "[verify-deploy] OK — production is on $SHORT_HEAD (state=$state)"
      exit 0
    else
      short_remote="${deploy_sha:0:7}"
      echo "[verify-deploy] MISMATCH — HEAD=$SHORT_HEAD but production=$short_remote (state=$state)" >&2
      echo "[verify-deploy] webhook may be broken. check: gh api repos/<owner>/<repo>/hooks" >&2
      exit 1
    fi
    ;;
esac
