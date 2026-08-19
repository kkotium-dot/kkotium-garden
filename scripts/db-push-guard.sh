#!/usr/bin/env bash
# db-push-guard.sh — P0 봉인 가드 (2026-08-19, Desktop 발견 사고 후속)
#
# 사고: 맨손 `npx prisma db push`가 schema.prisma를 절대진리로 보고 프로덕션 DB의
# "잉여"를 전부 삭제로 해석한다. schema.prisma가 DB보다 9테이블·21컬럼 뒤처져
# 있던 상태에서 실행됐다면 DROP TABLE 9 / DROP COLUMN 21 / DROP INDEX 10 /
# DROP CONSTRAINT 13이 실제로 발생했을 것 — Desktop이 migrate diff(읽기전용)로
# 사전 확인해 실행 직전에 막았다.
#
# 원칙: 드리프트가 있는 DB에서 db push는 파괴 도구다. 실행 전 migrate diff로
# DROP 포함 여부를 반드시 확인한다. 이 스크립트를 거치지 않은 맨손 `prisma db push`
# 호출은 금지 — README/CLAUDE.md에도 명시.
#
# Usage:
#   scripts/db-push-guard.sh --check-only   # diff만 보고 종료 (db:check)
#   scripts/db-push-guard.sh                # 통과 시에만 실제 db push 실행 (db:push)

set -euo pipefail

CHECK_ONLY=0
if [[ "${1:-}" == "--check-only" ]]; then CHECK_ONLY=1; fi

if [[ -z "${DIRECT_URL:-}" ]]; then
  echo "[db-push-guard] DIRECT_URL not set — cannot diff against production." >&2
  exit 2
fi

DIFF_FILE="$(mktemp -t kg_diff_XXXXXX.sql)"
trap 'rm -f "$DIFF_FILE"' EXIT

npx prisma migrate diff \
  --from-url "$DIRECT_URL" \
  --to-schema-datamodel prisma/schema.prisma \
  --script > "$DIFF_FILE"

DROP_COUNT="$(grep -ciE '^\s*DROP\s' "$DIFF_FILE" || true)"

echo "[db-push-guard] diff generated: $DIFF_FILE"
echo "[db-push-guard] DROP statements found: $DROP_COUNT"

if [[ "$DROP_COUNT" -gt 0 ]]; then
  echo "[db-push-guard] BLOCKED — schema.prisma is behind production DB (drift)." >&2
  echo "[db-push-guard] db push would DROP $DROP_COUNT object(s). Refusing to run." >&2
  echo "[db-push-guard] Review $DIFF_FILE, reconcile schema.prisma with production first." >&2
  exit 1
fi

echo "[db-push-guard] clean — no DROP statements. Safe to push (additive only)."

if [[ "$CHECK_ONLY" -eq 1 ]]; then
  exit 0
fi

npx prisma db push
