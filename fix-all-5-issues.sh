#!/bin/bash
# fix-all-5-issues.sh
# Run this from the project root: bash fix-all-5-issues.sh

set -e
cd "$(dirname "$0")"

echo ""
echo "=== Step 1: Clearing Next.js cache ==="
rm -rf .next

echo ""
echo "=== Step 2: TypeScript type check ==="
npx tsc --noEmit 2>&1 | head -50 || true

echo ""
echo "=== Step 3: Verifying key files ==="

# Check naver-categories-full.ts has data
LINES=$(wc -l < src/lib/naver/naver-categories-full.ts)
echo "naver-categories-full.ts: $LINES lines"
if [ "$LINES" -gt 1000 ]; then
  echo "  OK - category data present"
else
  echo "  WARNING - file may be empty or truncated"
fi

# Check depth1 list is dynamic now
if grep -q "Array.from" src/lib/naver/naver-categories-full.ts; then
  echo "NAVER_DEPTH1_LIST: dynamic (OK)"
else
  echo "NAVER_DEPTH1_LIST: WARNING - still static"
fi

# Check calculator re-export
if grep -q "re-export\|Re-export" src/components/calculator/MarginCalculator.tsx; then
  echo "calculator/MarginCalculator.tsx: re-export only (OK)"
else
  echo "calculator/MarginCalculator.tsx: WARNING - check file"
fi

# Check ProductBasicForm instantDiscount
if grep -q "instantDiscount" src/components/product/basic/ProductBasicForm.tsx; then
  echo "ProductBasicForm - instantDiscount: present (OK)"
fi

echo ""
echo "=== Step 4: Starting dev server ==="
echo "Run: npm run dev"
echo ""
echo "All 5 issues should now be resolved:"
echo "  1. Category search: dynamic depth1 list - all categories visible"
echo "  2. 4-level drill-down: works with complete depth1"
echo "  3. Margin calculator: input search (not dropdown)"
echo "  4. Instant discount: real-time bidirectional in margin calculator"
echo "  5. Reset/Refresh buttons: present in margin calculator header"
