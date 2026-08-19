#!/usr/bin/env bash
# verify-vercel-deploy.sh — work principle #36 enforcer
#
# Verifies that the current HEAD commit has been deployed to Vercel production.
#
# Verification paths (auto-selected, in priority order):
#   1. Vercel API path  (preferred) — uses VERCEL_TOKEN. Reports real build state (READY/BUILDING/ERROR).
#   2. GitHub Deployments path (fallback) — uses gh CLI. Reports deployment registration only.
#      ⚠ 2026-08-19 발견(P0-1 #3): 이 경로는 git-integration이 만든 deployment만 잡는다.
#        `vercel deploy --prod` 같은 CLI 수동배포는 GitHub Deployments API에 기록을 남기지
#        않아 실제로는 배포됐는데도 MISMATCH로 오판(false negative)한다.
#   3. Vercel CLI path (cross-check, always runs) — `vercel ls <project> --json`으로 최신
#      production 배포를 직접 조회. git-integration 배포는 meta.githubCommitSha로 완전
#      일치를 확인하고, CLI 수동배포는 meta가 없으므로 배포 시각이 HEAD 커밋 시각보다
#      늦은지로 판단한다(정확한 SHA 증명은 아니지만 위 false negative를 해소한다).
#
# Usage:
#   scripts/verify-vercel-deploy.sh            # check HEAD against latest production deployment
#   scripts/verify-vercel-deploy.sh --wait     # poll up to 180s until match (after push)
#
# Exit codes:
#   0 = HEAD SHA matches latest production deployment commit SHA (or CLI-path timing match)
#   1 = mismatch (production is on a different commit — integration may be broken)
#   2 = no Vercel token AND no gh CLI / both APIs unreachable
#   3 = VERCEL_PROJECT_ID / VERCEL_ORG_ID missing (Vercel path only)
#   4 = local HEAD is not in sync with origin/main — fix before deploying (P0-1 #1)
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
HEAD_COMMIT_TS="$(git log -1 --format=%ct HEAD)"  # epoch seconds

# ---------------------------------------------------------------------------
# P0-1 #1 — refuse to verify/deploy from a checkout that has diverged from
# origin/main. A stale local HEAD makes every check below meaningless (you'd
# be confirming the wrong commit ever reaches production).
# ---------------------------------------------------------------------------
if git rev-parse --verify -q origin/main >/dev/null; then
  git fetch origin main -q || true
fi
if git rev-parse --verify -q origin/main >/dev/null; then
  ORIGIN_MAIN_SHA="$(git rev-parse origin/main)"
  if [[ "$HEAD_SHA" != "$ORIGIN_MAIN_SHA" ]]; then
    echo "[verify-deploy] BLOCKED — local HEAD ($SHORT_HEAD) != origin/main ($(git rev-parse --short origin/main))" >&2
    echo "[verify-deploy] sync first: git pull / git push, then re-run." >&2
    exit 4
  fi
fi

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
# Vercel CLI cross-check (path 3, always available if `vercel` CLI is authed)
# — resolves the CLI-manual-deploy false negative from paths 1/2 (P0-1 #3).
# ---------------------------------------------------------------------------

cli_cross_check() {
  local project resp sha created state
  project="$(jq -r '.projectName // empty' .vercel/project.json 2>/dev/null || true)"
  [[ -z "$project" ]] && project="kkotium-garden"
  resp="$(npx --yes vercel ls "$project" --json --limit 5 2>/dev/null || true)"
  [[ -z "$resp" ]] && { echo "CLI_UNAVAILABLE"; return; }

  # Prefer an exact meta.githubCommitSha match among recent production deploys.
  sha="$(echo "$resp" | jq -r --arg want "$HEAD_SHA" \
    '.deployments[]? | select(.target=="production" and .meta.githubCommitSha==$want) | .meta.githubCommitSha' \
    | head -1)"
  if [[ -n "$sha" ]]; then
    echo "EXACT_MATCH"
    return
  fi

  # No git metadata (CLI manual deploy) — fall back to timing: is the latest
  # READY production deployment newer than HEAD's own commit timestamp?
  created="$(echo "$resp" | jq -r '[.deployments[]? | select(.target=="production" and .state=="READY")] | sort_by(.createdAt) | last | .createdAt // empty')"
  if [[ -z "$created" ]]; then echo "NO_DEPLOY"; return; fi
  local created_s=$(( created / 1000 ))
  if [[ "$created_s" -gt "$HEAD_COMMIT_TS" ]]; then
    echo "TIMING_MATCH ${created_s}"
  else
    echo "STALE ${created_s}"
  fi
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
          # CLI cross-check (P0-1 #3) — catches CLI-manual deploys that this
          # path's SHA source (git-integration only) can never see.
          cli_result="$(cli_cross_check)"
          case "$cli_result" in
            EXACT_MATCH)
              echo "[verify-deploy] OK (vercel-cli, exact githubCommitSha match) — production is on $SHORT_HEAD"
              exit 0
              ;;
            TIMING_MATCH*)
              echo "[verify-deploy] OK (vercel-cli, timing match — CLI manual deploy after $SHORT_HEAD)"
              exit 0
              ;;
            *)
              echo "[verify-deploy] still on $short_remote (state=$state), polling..."
              sleep 10
              ;;
          esac
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

if [[ "$result" == "FAIL_API" ]]; then
  echo "[verify-deploy] cannot reach $ACTIVE_PATH API" >&2
  exit 2
fi

if [[ "$result" == "NO_DEPLOY" ]]; then
  echo "[verify-deploy] no production deployment found via $ACTIVE_PATH — trying CLI cross-check..." >&2
  deploy_sha=""
  state=""
else
  deploy_sha="${result% *}"
  state="${result#* }"
fi

if [[ -n "$deploy_sha" && "$deploy_sha" == "$HEAD_SHA" ]]; then
  echo "[verify-deploy] OK ($ACTIVE_PATH) — production is on $SHORT_HEAD (state=$state)"
  exit 0
fi

if [[ -n "$deploy_sha" ]]; then
  short_remote="${deploy_sha:0:7}"
  echo "[verify-deploy] MISMATCH ($ACTIVE_PATH) — HEAD=$SHORT_HEAD but production=$short_remote (state=$state)" >&2
fi

echo "[verify-deploy] cross-checking via Vercel CLI (path 3)..." >&2
cli_result="$(cli_cross_check)"
case "$cli_result" in
  EXACT_MATCH)
    echo "[verify-deploy] OK (vercel-cli, exact githubCommitSha match) — production is on $SHORT_HEAD"
    exit 0
    ;;
  TIMING_MATCH*)
    echo "[verify-deploy] OK (vercel-cli, timing match — no git metadata, likely CLI manual deploy after $SHORT_HEAD)"
    echo "[verify-deploy] this is a heuristic, not a SHA proof — confirm with 'vercel inspect <alias> --json' if in doubt." >&2
    exit 0
    ;;
  *)
    echo "[verify-deploy] CLI cross-check also failed ($cli_result)." >&2
    echo "[verify-deploy] Vercel git integration may be broken. checks to run:" >&2
    echo "[verify-deploy]   - gh api repos/<owner>/<repo>/deployments" >&2
    echo "[verify-deploy]   - vercel ls kkotium-garden --json --limit 5" >&2
    echo "[verify-deploy]   - Vercel dashboard: Settings -> Git -> Connect Git Repository" >&2
    exit 1
    ;;
esac
