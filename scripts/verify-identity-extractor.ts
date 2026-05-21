// scripts/verify-identity-extractor.ts
//
// Sprint 7-M2 5-B verification — identity extractor Phase 1.
//
// Tests four invariants from IDENTITY_EXTRACTOR_PHASE1_SPEC §10:
//   1. Tokenizer protects 달항아리 (never split to ["달","항아리"]),
//      preserves 액막이 / 집들이 / 도어벨 / 개업선물.
//   2. Generic modifier "디자인" is dropped during noun extraction.
//   3. Leaf-category matching: products sharing category3 but differing at
//      category4 are correctly classified as modifier (not identity).
//   4. Competitor count correction: uniqueSellers <= total (sometimes <<).
//
// Network probes (Naver Shopping Search) are conditional — when
// NAVER_OPENAPI_CLIENT_ID is unset we exercise the pure-logic paths only
// (mock injected via _internals). This keeps CI green offline while letting
// a developer with creds get a full end-to-end signal.
//
// Run: npx tsx scripts/verify-identity-extractor.ts

import { config } from 'dotenv';
import { expand } from 'dotenv-expand';
expand(config({ path: '.env.local' }));

import { extractNouns } from '../src/lib/strategy/morpheme-tokenizer';
import {
  _internals as extractorInternals,
} from '../src/lib/strategy/identity-extractor';

let exitCode = 0;

function assert(cond: boolean, label: string): void {
  if (cond) {
    console.log(`[PASS] ${label}`);
  } else {
    console.log(`[FAIL] ${label}`);
    exitCode = 1;
  }
}

async function main(): Promise<void> {
  console.log('=== Sprint 7-M2 5-B — Identity extractor Phase 1 ===');

  // ---- (1) Tokenizer — compound noun protection --------------------------
  console.log('\n[1] morpheme-tokenizer compound-noun protection');
  const sample = '디자인 복 달항아리 도어벨 개업선물 액막이 집들이 이사 결혼 신혼 인테리어';
  const { nouns, matchedCompounds } = extractNouns(sample);
  console.log('input:', sample);
  console.log('extracted nouns:', nouns);
  console.log('matched compounds:', matchedCompounds);

  assert(nouns.includes('달항아리'), '"달항아리" preserved as single token');
  assert(!nouns.includes('달'), '"달" alone NOT in output (no over-split)');
  assert(!nouns.includes('항아리'), '"항아리" alone NOT in output');
  assert(nouns.includes('도어벨'), '"도어벨" preserved');
  assert(nouns.includes('개업선물'), '"개업선물" preserved as compound');
  assert(nouns.includes('액막이'), '"액막이" preserved (not trimmed to 액막)');
  assert(nouns.includes('집들이'), '"집들이" preserved (not trimmed to 집들)');
  assert(!nouns.includes('디자인'), '"디자인" dropped (generic modifier)');
  assert(!nouns.includes('복'), '"복" dropped (single-char)');
  assert(matchedCompounds.includes('달항아리'), 'matchedCompounds reports 달항아리');

  // ---- (2) Tokenizer — empty / malformed input ---------------------------
  console.log('\n[2] morpheme-tokenizer edge cases');
  assert(extractNouns('').nouns.length === 0, 'empty input → empty nouns');
  assert(
    extractNouns(null as unknown as string).nouns.length === 0,
    'null input → empty nouns',
  );
  const skuOnly = extractNouns('SKU-12345 ABC123');
  assert(skuOnly.nouns.length === 0, 'pure SKU tokens dropped');

  // ---- (3) Leaf-category matcher — category3 trap defense ----------------
  console.log('\n[3] identity-extractor.categoryMatch leaf-only invariant');
  // Both 도어벨 and 개업선물 sit under category3="인테리어소품" but their
  // category4 differs (도어벨 vs 장식인형). categoryMatch MUST refuse
  // category3 hits.
  assert(
    extractorInternals.categoryMatch('도어벨', '도어벨'),
    'identical leaf strings match',
  );
  assert(
    !extractorInternals.categoryMatch('장식인형', '도어벨'),
    'different leaves under same category3 → no match',
  );
  assert(
    !extractorInternals.categoryMatch('', '도어벨'),
    'empty probed leaf → no match',
  );
  assert(
    !extractorInternals.categoryMatch('도어벨', ''),
    'empty product leaf → no match',
  );

  // ---- (4) getLeafCategory — category4 first, category3 fallback ---------
  console.log('\n[4] identity-extractor.getLeafCategory fallback semantics');
  const exact = extractorInternals.getLeafCategory({
    title: '...',
    link: '',
    image: '',
    lprice: '0',
    hprice: '0',
    mallName: 'shop',
    productId: '1',
    category1: '생활/건강',
    category2: '인테리어',
    category3: '인테리어소품',
    brand: '',
    maker: '',
    category4: '도어벨',
  });
  assert(exact.leaf === '도어벨', 'category4 used when present');
  assert(exact.isExact === true, 'isExact=true on category4 hit');

  const fallback = extractorInternals.getLeafCategory({
    title: '...',
    link: '',
    image: '',
    lprice: '0',
    hprice: '0',
    mallName: 'shop',
    productId: '1',
    category1: '생활/건강',
    category2: '인테리어',
    category3: '인테리어소품',
    brand: '',
    maker: '',
  });
  assert(fallback.leaf === '인테리어소품', 'category3 used as fallback');
  assert(fallback.isExact === false, 'isExact=false on category3 fallback');

  // ---- (5) countUniqueSellers — inflation correction ---------------------
  console.log('\n[5] identity-extractor.countUniqueSellers dedup');
  const items = [
    { mallName: 'shopA' }, { mallName: 'shopA' }, { mallName: 'shopB' },
    { mallName: '' }, { mallName: 'shopC' }, { mallName: 'shopA' },
  ];
  const unique = extractorInternals.countUniqueSellers(
    items as unknown as Parameters<typeof extractorInternals.countUniqueSellers>[0],
  );
  assert(unique === 3, 'shopA dedup + empty mallName dropped → 3 unique sellers');

  // ---- (6) Conditional live probe (requires creds) -----------------------
  const hasNaverCreds =
    !!process.env.NAVER_OPENAPI_CLIENT_ID || !!process.env.NAVER_DATALAB_CLIENT_ID;
  console.log(`\n[6] Live shopping probe (NAVER creds present: ${hasNaverCreds})`);
  if (hasNaverCreds) {
    const probe = await extractorInternals.probeShopping('달항아리 도어벨');
    if (probe) {
      console.log('probe →', probe);
      assert(probe.total >= 0, 'live probe returned non-negative total');
      assert(probe.uniqueSellers <= probe.total || probe.total === 0, 'uniqueSellers <= total invariant');
    } else {
      console.log('[SKIP] probe returned null — Naver API blip; not a test failure');
    }
  } else {
    console.log('[SKIP] no Naver credentials in environment — live probe deferred');
  }

  console.log(`\n=== exit code: ${exitCode} ===`);
  process.exit(exitCode);
}

main().catch((err) => {
  console.error('verify-identity-extractor crashed:', err);
  process.exit(1);
});
