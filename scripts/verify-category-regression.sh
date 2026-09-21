#!/bin/bash
# 카테고리 매처 회귀 검증 스크립트 — docs/playbook/REGRESSION_SAMPLE_SET.md 정본
# 사용: bash scripts/verify-category-regression.sh
set -u
BASE="https://kkotium-garden.vercel.app/api/category/suggest"
TAG=$(date +%s)
FAIL_COUNT=0

check() {
  local name="$1"
  local expected_d1="$2"
  local result=$(curl -s -X POST "$BASE" -H "Content-Type: application/json" \
    -d "{\"productName\":\"$name REGCHK$TAG\"}")
  local d1=$(echo "$result" | python3 -c "import json,sys; print(json.load(sys.stdin)['suggestions'][0]['d1'])" 2>/dev/null)
  if [ "$d1" = "$expected_d1" ]; then
    echo "✅ $name -> $d1"
  else
    echo "❌ $name -> $d1 (기대: $expected_d1)"
    FAIL_COUNT=$((FAIL_COUNT+1))
  fi
}

echo "=== 그룹A: 슬래시-합성어 교차도메인(IDIOM-6 클래스) ==="
check "휴대폰 스트랩 액세서리" "디지털/가전"
check "카메라 스트랩" "디지털/가전"
check "아로마 디퓨저 세트" "가구/인테리어"
check "골프 우산" "스포츠/레저"

echo "=== 그룹B: 완전동음이의(같은 leaf명, 다른 d1) ==="
check "우아한 헤어핀 액세서리" "패션잡화"
check "유아용 헤어핀" "출산/육아"
check "여성 니트 카디건" "패션의류"
check "휴대폰 케이스" "디지털/가전"

echo "=== 그룹C: 일반 상품(회귀 없어야 할 대조군) ==="
check "남성 골프 바지" "스포츠/레저"
check "여성 등산 바지" "스포츠/레저"
check "천연 비취 옥반지" "패션잡화"

echo ""
if [ "$FAIL_COUNT" -eq 0 ]; then
  echo "전체 통과 (11/11)"
  exit 0
else
  echo "$FAIL_COUNT 건 실패 — 위 결과 확인"
  exit 1
fi
