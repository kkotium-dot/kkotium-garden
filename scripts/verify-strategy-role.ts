// scripts/verify-strategy-role.ts
//
// Sprint 7-M2 5-B verification — exercises:
//   1. Typo fix in keyword-api.ts: '낮음' (not '낙음') normalises to 'low'.
//      The original code path is unreachable here without a live API call,
//      but we can prove the source string is correct via grep — done in the
//      bash wrapper. Here we directly re-import the module to ensure it
//      still compiles + exports the same surface.
//   2. role-engine.classifyRole on realistic signal sets:
//      - 잠옷세트 (high volume, 44,063 competitors) → battleground
//      - 가상 꿀통 (high volume, very few competitors, low competition) → ace
//      - 신상 트렌드 (rising slope, mid competition) → trend
//      - 틈새 (small volume, very few competitors) → niche
//      - 빈약한 데이터 → standard
//   3. asset-status.classifyAssetStatus role-aware shifts:
//      - 동일 점수 + ace role → higher autoBloomFloor (designer bias)
//      - 동일 점수 + trend role → lower autoBloomFloor (speed bias)
//   4. prompt-translator.composeRulePrompt produces a non-empty prompt that
//      includes the product subject anchor.
//
// Run: npx tsx scripts/verify-strategy-role.ts

import { config } from 'dotenv';
import { expand } from 'dotenv-expand';
expand(config({ path: '.env.local' }));

import { fetchKeywordStats } from '../src/lib/naver/keyword-api';
import {
  classifyRole,
  computeOpportunityIndex,
  _internals as roleInternals,
  type StrategySignals,
} from '../src/lib/strategy/role-engine';
import {
  classifyAssetStatus,
} from '../src/lib/art-director/asset-status';
import {
  _internals as translatorInternals,
} from '../src/lib/art-director/prompt-translator';

let exitCode = 0;

function assert(cond: boolean, label: string): void {
  if (cond) {
    console.log(`[PASS] ${label}`);
  } else {
    console.log(`[FAIL] ${label}`);
    exitCode = 1;
  }
}

function main(): void {
  console.log('=== Sprint 7-M2 5-B — Strategy role + art director ===');

  // ---- (1) keyword-api typo fix — module loads + exports stable ----------
  console.log('\n[1] keyword-api.ts module surface');
  assert(typeof fetchKeywordStats === 'function', 'fetchKeywordStats is exported');

  // ---- (2) role-engine classification cases ------------------------------
  console.log('\n[2] role-engine classifyRole');

  // 잠옷세트 — PlayMCP실측: 검색량 ~7,000 / 상품수 44,063 / honey 72
  const pajama: StrategySignals = {
    searchVolume: 7000,
    productCount: 44063,
    trendSlope: 0,
    honeyScore: 72,
    competitionIdx: 'high',
  };
  const pajamaRole = classifyRole(pajama);
  console.log('잠옷세트 →', pajamaRole);
  assert(pajamaRole.role === 'battleground', '잠옷세트 (vol 7k, comp 44k, honey 72, high) → battleground');
  assert(pajamaRole.designerEffortMultiplier > 1, 'battleground multiplier > 1 (designer bias)');

  // 가상 꿀통 — high volume, few competitors, low ad competition
  const honeyHole: StrategySignals = {
    searchVolume: 50000,
    productCount: 800,
    trendSlope: 0.1,
    honeyScore: 85,
    competitionIdx: 'low',
  };
  const honeyHoleRole = classifyRole(honeyHole);
  console.log('꿀통 →', honeyHoleRole);
  assert(honeyHoleRole.role === 'ace', '꿀통 (vol 50k, comp 800, honey 85, low) → ace');
  assert(honeyHoleRole.opportunityIndex >= roleInternals.thresholds.OPPORTUNITY_ACE_FLOOR, 'ace passes opportunity floor');

  // 신상 트렌드 — fresh upward slope, mid competition
  const trending: StrategySignals = {
    searchVolume: 8000,
    productCount: 2000,
    trendSlope: 0.45,
    honeyScore: 0,
    competitionIdx: 'mid',
  };
  const trendingRole = classifyRole(trending);
  console.log('트렌드 →', trendingRole);
  assert(trendingRole.role === 'trend', 'rising trend (slope +0.45, mid) → trend');
  assert(trendingRole.designerEffortMultiplier < 1, 'trend multiplier < 1 (speed bias)');

  // 틈새 — small volume vs few competitors
  const niche: StrategySignals = {
    searchVolume: 1000,
    productCount: 100,
    trendSlope: 0,
    honeyScore: 0,
    competitionIdx: 'mid',
  };
  const nicheRole = classifyRole(niche);
  console.log('틈새 →', nicheRole);
  assert(nicheRole.role === 'niche' || nicheRole.role === 'ace', 'niche/ace (vol 1k, comp 100) — high opportunity band');

  // 빈약한 데이터 — below floor
  const insufficient: StrategySignals = {
    searchVolume: 30,
    productCount: 5,
    trendSlope: 0,
    honeyScore: 0,
    competitionIdx: 'unknown',
  };
  const insufficientRole = classifyRole(insufficient);
  console.log('insufficient →', insufficientRole);
  assert(insufficientRole.role === 'standard', 'insufficient data → standard');

  // opportunity index math sanity
  assert(computeOpportunityIndex(50000, 800) > computeOpportunityIndex(7000, 44063), 'opportunity index ordering: ace > battleground');
  assert(computeOpportunityIndex(100, 0) === 0, 'opportunity index zero-guard on productCount=0');

  // ---- (3) asset-status role-aware shifts --------------------------------
  console.log('\n[3] asset-status.classifyAssetStatus role-aware shifts');
  const baseInputs = { inferenceConfidence: 80, imageAnalysisConfidence: 0.8 };
  const aceStatus = classifyAssetStatus({
    ...baseInputs,
    role: 'ace',
    designerEffortMultiplier: 1.5,
  });
  const trendStatus = classifyAssetStatus({
    ...baseInputs,
    role: 'trend',
    designerEffortMultiplier: 0.8,
  });
  console.log('ace status →', aceStatus);
  console.log('trend status →', trendStatus);
  assert(
    aceStatus.autoBloomFloor > trendStatus.autoBloomFloor,
    'ace autoBloomFloor > trend autoBloomFloor (designer bias is real)',
  );
  // Same composite score, but ace might still hit lets_refine while trend
  // auto_blooms — that is the role-aware behavior we want.
  assert(
    trendStatus.status === 'auto_bloomed',
    'trend role with 80/0.8 composite → auto_bloomed (speed bias passes)',
  );

  // Image analysis missing demotes by one step.
  const noImage = classifyAssetStatus({
    inferenceConfidence: 90,
    imageAnalysisConfidence: 0,
    role: 'standard',
    designerEffortMultiplier: 1.0,
  });
  console.log('noImage →', noImage);
  assert(
    noImage.status !== 'auto_bloomed',
    'imageAnalysisConfidence=0 never reaches auto_bloomed',
  );

  // ---- (4) prompt-translator rule-based composition ----------------------
  console.log('\n[4] prompt-translator rule-based composition');
  const rule = translatorInternals.composeRulePrompt({
    productName: '디자인 복 달항아리 도어벨',
    category: '기타장식용품',
    conceptTone: {
      persona: '30-40s',
      context: 'gift',
      pricePosition: 'standard',
      productType: 'single',
      colorMood: 'warm',
      emotionalTone: 'friendly',
      photoStyle: 'lifestyle',
      genre: 'korean',
    },
    inferenceConfidence: 78,
  });
  console.log('rule prompt →', rule.prompt);
  assert(rule.prompt.length > 80, 'rule prompt is non-trivial (>80 chars)');
  assert(rule.prompt.includes('디자인 복 달항아리 도어벨'), 'rule prompt anchors the product name');
  assert(rule.prompt.includes('Korean hanok'), 'genre=korean keyword present');
  assert(rule.prompt.includes('gift'), 'context=gift keyword present');
  assert(rule.contributingAxes.includes('genre'), 'contributingAxes includes genre');

  console.log(`\n=== exit code: ${exitCode} ===`);
  process.exit(exitCode);
}

main();
