// scripts/verify-b06-no-hallucination.ts
//
// Sprint 7-M2 Step 5-B verification — B06 spec table must NOT hallucinate.
//
// Test product is the real "달항아리 도어벨" case that triggered the 5-A
// regression: name + brand only, no real specs in the catalog. Its only
// signal is options = [정사각, 직사각]. After this fix:
//   1. spec-extractor.ts must extract 형태 = "정사각/직사각"
//   2. B06 composer must emit that row verbatim
//   3. B06 composer must NEVER emit literal substrings like "유리",
//      "플라스틱", "스테인리스", "12cm", "200g" — those were the 5-A
//      hallucinations and there is zero ground truth for them.
//
// Run: npx tsx scripts/verify-b06-no-hallucination.ts
// Exits 1 on any negative-assert failure.

import { config } from 'dotenv';
import { expand } from 'dotenv-expand';
expand(config({ path: '.env.local' }));

import {
  composeB06SpecTable,
  type ProductData,
} from '../src/lib/automation/section-composer';
import {
  parseSpecsFromOptions,
} from '../src/lib/automation/spec-extractor';

let exitCode = 0;

function assert(cond: boolean, label: string): void {
  if (cond) {
    console.log(`[PASS] ${label}`);
  } else {
    console.log(`[FAIL] ${label}`);
    exitCode = 1;
  }
}

// Substrings that B06 was hallucinating in 5-A. Any literal occurrence in
// every variant is a regression.
const HALLUCINATION_TOKENS = [
  '유리',
  '플라스틱',
  '스테인리스',
  '스텐',
  '도자기',
  '세라믹',
  '실리콘',
  '12cm',
  '15cm',
  '10cm',
  '20cm',
  '30cm',
  '200g',
  '300g',
  '500g',
  '15 x 6',
  '10 x 10',
  '12 x 10',
];

async function main(): Promise<void> {
  console.log('=== Sprint 7-M2 Step 5-B — B06 hallucination guard ===');

  // ---- Stage 1: spec-extractor unit check --------------------------------
  const parsed = parseSpecsFromOptions([
    { name: '디자인 복 달항아리 도어벨 ( 정사각 )', addPrice: 0 },
    { name: '디자인 복 달항아리 도어벨 ( 직사각 )', addPrice: 0 },
  ]);

  console.log('\nspec-extractor output:');
  console.log(JSON.stringify(parsed, null, 2));

  assert(parsed.matchCount >= 1, 'spec-extractor finds at least one axis');
  assert(parsed.specs.shape === '정사각/직사각', 'shape = "정사각/직사각" (both options parsed)');
  assert(parsed.labeledRows.some((r) => r.label === '형태'), 'labeledRows includes 형태');
  assert(!parsed.specs.material, 'NO material guessed (none in source)');
  assert(!parsed.specs.color, 'NO color guessed (none in source)');

  // Stripped prefix should not pollute matching — the product name appears
  // identically in both options so it must not be inspected.
  assert(
    parsed.labeledRows.every((r) => !r.value.includes('달항아리')),
    'product-name noise stripped from extracted values',
  );

  // ---- Stage 2: composeB06 with real data --------------------------------
  const dummy: ProductData = {
    id: 'verify-b06-hallucination',
    name: '디자인 복 달항아리 도어벨 개업선물 액막이 집들이 이사 결혼 신혼 인테리어',
    salePrice: 27200,
    category: 'uncategorized',
    brand: '꽃틔움',
    shippingFee: 3000,
    crawledOptions: [
      { name: '디자인 복 달항아리 도어벨 ( 정사각 )', addPrice: 0 },
      { name: '디자인 복 달항아리 도어벨 ( 직사각 )', addPrice: 0 },
    ],
    crawledCategory: '기타장식용품',
    // No knownSpecs — relying on extractor only.
  };

  const result = await composeB06SpecTable(dummy);
  console.log('\nB06 composeB06SpecTable output:');
  for (const v of result.variants) {
    console.log(`\n  ▶ ${v.variantId} (${v.tone}/${v.length}, source=${v.source}):`);
    for (const line of v.content.split('\n')) {
      console.log(`      ${line}`);
    }
  }

  assert(result.variants.length === 4, 'B06 returns 4 variants');

  // ---- Stage 3: positive assertions (form extraction present) ------------
  const allContainShape = result.variants.every((v) => /정사각|직사각/.test(v.content));
  assert(allContainShape, 'every variant mentions 정사각 or 직사각 (extracted shape)');

  // ---- Stage 4: negative assertions (no hallucinations) ------------------
  // A variant is "clean" if none of the hallucination tokens appear.
  // Note: this is a STRICT test — the source product has NO confirmed
  // material/color/size, so any of those words = a hallucination.
  let hallucinatedAny = false;
  for (const v of result.variants) {
    const found = HALLUCINATION_TOKENS.filter((tok) => v.content.includes(tok));
    if (found.length > 0) {
      console.log(`\n  [HALLUCINATION] variant ${v.variantId} contains: ${found.join(', ')}`);
      hallucinatedAny = true;
    }
  }
  assert(!hallucinatedAny, 'NO variant contains hallucinated material/size/color tokens');

  // ---- Stage 5: placeholder for unknown specs ----------------------------
  // At least one variant should use the "상세문의" sentinel for unknown
  // axes (this confirms the prompt is doing what it claims).
  const usesPlaceholder = result.variants.some((v) => v.content.includes('상세문의'));
  assert(usesPlaceholder, 'at least one variant uses "상세문의" sentinel for unknown axes');

  // ---- Stage 6: fallback path still works without crawledOptions ---------
  const noData: ProductData = {
    id: 'verify-b06-no-options',
    name: '테스트 상품',
    salePrice: 10000,
    brand: '꽃틔움',
  };
  const noDataResult = await composeB06SpecTable(noData);
  const noDataNoHallucination = noDataResult.variants.every((v) => {
    const found = HALLUCINATION_TOKENS.filter((tok) => v.content.includes(tok));
    return found.length === 0;
  });
  assert(
    noDataNoHallucination,
    'B06 with NO crawledOptions still avoids hallucinations',
  );

  console.log(`\n=== exit code: ${exitCode} ===`);
  process.exit(exitCode);
}

main().catch((err) => {
  console.error('verify-b06-no-hallucination crashed:', err);
  process.exit(1);
});
