// src/lib/sourcing-lenses.ts
// ============================================================================
// 꼬띠 소싱 v2 로드맵 1b — 다중 발굴 렌즈 (§3-0)
// Authority: docs/design/KKOTTI_DAILY_SOURCING_V2_2026-08-07.md §3-0
// Handoff:   docs/handoff/CODE_SOURCING_V2_LENSES_HANDOFF_2026-08-10.md
// ============================================================================
//
// 기존 `naver/recommendation-type.ts`의 3렌즈 분류기(황금🏆/니치💎/시즌🗓️)를
// 8개 렌즈로 확장한다. 신규 대발명이 아니라 기존 엔진(computeCategoryScore,
// getMarginAdvice)과 이번 로드맵 1b에서 trend-analyzer.ts에 추가한
// rising-rate/volatility 신호를 재조합하는 순수 분류 계층이다.
//
// | 렌즈           | 포착하는 기회              | 신호원(재활용)                         |
// |----------------|---------------------------|-----------------------------------------|
// | 📈 급상승       | 지금 막 뜨기 시작           | trend-analyzer CategoryTrendSignal      |
// | 🗓️ 시즌 선점    | 곧 다가올 시즌              | naver-margin-advisor seasonality        |
// | 💎 니치         | 경쟁 적은 틈새              | roiScore 안정 + seoScore 미달(비과열)    |
// | 🌊 블루오션     | 수요 있고 경쟁 낮음          | 외부에서 계산된 blueOceanScore(재사용)   |
// | 🍯 꿀통(마진)   | 마진 우수 상품              | roiScore 高                             |
// | 🏆 황금키워드   | 검색 高 + 마진 高            | seoScore↑ AND roiScore↑                 |
// | 📚 스테디셀러   | 트렌드 무관 꾸준 수요         | trend-analyzer isStable                 |
// | ⚠️ 레드오션(경고)| 경쟁 과열 — 발굴 아닌 경고    | uniqueSellersInTop 多 + competition 高   |
//
// 순수 함수만 — I/O 없음. 호출자가 async 조회(트렌드 캐시·DataLab 신호·
// blueOceanScore 등)를 먼저 마치고 이 모듈에 값으로 주입한다(#249 스타일).
// ============================================================================

import { computeCategoryScore, type CategoryScore } from './naver/category-score';
import { getMarginAdvice } from './naver-margin-advisor';
import type { CategoryTrendEntry } from './naver/category-trend-cache';
import type { CategoryTrendSignal } from './trend-analyzer';

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

/** 8개 중 발굴(discovery) 렌즈 7개. 레드오션은 별도 경고 렌즈(아래 RedOceanWarning). */
export type SourcingLens =
  | 'rising'    // 📈 급상승
  | 'seasonal'  // 🗓️ 시즌 선점
  | 'niche'     // 💎 니치
  | 'blueOcean' // 🌊 블루오션
  | 'honeypot'  // 🍯 꿀통(마진)
  | 'golden'    // 🏆 황금키워드
  | 'steady';   // 📚 스테디셀러

export interface LensMeta {
  emoji: string;
  label: string;
}

export const LENS_META: Record<SourcingLens, LensMeta> = {
  rising:    { emoji: '📈', label: '급상승' },
  seasonal:  { emoji: '🗓️', label: '시즌 선점' },
  niche:     { emoji: '💎', label: '니치' },
  blueOcean: { emoji: '🌊', label: '블루오션' },
  honeypot:  { emoji: '🍯', label: '꿀통' },
  golden:    { emoji: '🏆', label: '황금키워드' },
  steady:    { emoji: '📚', label: '스테디셀러' },
};

export const RED_OCEAN_META: LensMeta = { emoji: '⚠️', label: '레드오션 주의' };

/** One matched lens + why (seller language, #233). */
export interface LensMatch {
  lens: SourcingLens;
  emoji: string;
  label: string;
  reasons: string[];
}

/** Everything sourcing-lenses.ts needs to classify one candidate. Pure input —
 *  caller resolves all async lookups first (trend cache, DataLab signal,
 *  externally-computed blueOceanScore/competition) and passes plain values. */
export interface LensCandidateInput {
  d1: string;
  d2: string;
  d3: string;
  /** Wholesale price, when known — makes ROI product-specific (category-score). */
  supplierPrice?: number | null;
  shippingFee?: number | null;
  /** D1-level cached trend (existing category-trend-cache.ts signal). */
  trend?: CategoryTrendEntry | null;
  /** NEW (로드맵 1b): rising-rate/volatility from trend-analyzer.ts, same D1. */
  trendSignal?: CategoryTrendSignal | null;
  /** Current month 1..12 — enables the seasonal lens. */
  nowMonth?: number;
  /**
   * Blue-ocean composite score, computed elsewhere (wholesale-matcher /
   * sourcing-recommender — NOT recomputed here, out of this module's write
   * set). null/undefined = unknown, blueOcean lens simply won't fire.
   */
  blueOceanScore?: number | null;
  /** Unique sellers among top search results — red-ocean warning signal. */
  uniqueSellersInTop?: number | null;
  /** Coarse competition bucket, when available (from keyword-api / wholesale). */
  competitionLevel?: 'low' | 'mid' | 'high' | 'unknown';
}

/** ⚠️ 레드오션 — SourcingLens가 아니다(발굴 렌즈 목록에서 의도적으로 제외, §3-0).
 *  다른 렌즈로 뽑힌 후보에 붙는 경고 배지 전용 타입이라 `lens` 필드가 없다. */
export interface RedOceanWarning {
  emoji: string;
  label: string;
  reasons: string[];
}

export interface LensClassification {
  matches: LensMatch[]; // 0개 이상 — 한 상품이 여러 렌즈에 동시 해당 가능(설계 §3-0)
  redOceanWarning: RedOceanWarning | null; // 발굴 렌즈가 아니라 경고 배지
  score: CategoryScore; // 하위 호환 — 호출자가 정렬/표시에 재사용
}

// ----------------------------------------------------------------------------
// Tunables (documented constants, not magic numbers — #249 스타일 준수)
// ----------------------------------------------------------------------------

const HOT_SEO = 60;       // 검색 상승세 = hot (recommendation-type.ts와 동일 기준 유지)
const GOOD_ROI = 60;      // 마진 高 (황금 판정용)
const STABLE_ROI = 45;    // 마진 안정 (니치/꿀통 하한)
const HONEYPOT_ROI = 70;  // 꿀통(마진 우수) — 황금보다 엄격한 마진 단독 기준

// 시즌 선점: "지금은 잠잠하지만 곧 온다" — 성수기 시작 전 리드 윈도우(개월).
// recommendation-type.ts의 seasonalNow()는 "이번달 또는 다음달"만 봐서 급상승과
// 구분이 안 됨 — 시즌선점 렌즈는 의도적으로 "아직 이번달은 아니고 다음달~그다음달"만
// 잡아 급상승(지금 뜨는 것)과 겹치지 않게 한다.
const SEASON_LEAD_MONTHS_MIN = 1;
const SEASON_LEAD_MONTHS_MAX = 2;

// 레드오션 경고: 상위 결과에 판매자가 이만큼 몰려있고 경쟁이 high면 과열로 본다.
const RED_OCEAN_MIN_SELLERS = 8;

const MONTH_NAMES = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];

// ----------------------------------------------------------------------------
// 렌즈별 배분 상수 (설계 §3-0: "매일 10개를 렌즈별로 배분", 하드코딩 금지 → 조정 가능한 상수)
// ----------------------------------------------------------------------------

/**
 * 일일 소싱 추천 10개의 렌즈별 기본 배분. 설계 문서 예시(급상승2·시즌선점2·
 * 니치2·블루오션2·꿀통1·스테디1=10)를 그대로 상수화했다. 황금🏆은 전용 슬롯이
 * 아니라 다른 렌즈(주로 급상승·꿀통)와 겹쳐 나오는 "대형 기회" 오버레이 태그로
 * 설계됐고, 레드오션⚠️은 발굴 렌즈가 아닌 경고이므로 배분에서 제외한다.
 */
export const LENS_DAILY_QUOTA: Record<Exclude<SourcingLens, 'golden'>, number> = {
  rising: 2,
  seasonal: 2,
  niche: 2,
  blueOcean: 2,
  honeypot: 1,
  steady: 1,
};

// ----------------------------------------------------------------------------
// Helpers (pure)
// ----------------------------------------------------------------------------

/** 성수기가 지금부터 SEASON_LEAD_MONTHS_MIN~MAX개월 뒤에 오는가(아직 안 왔음). */
function seasonalLeadWindow(
  seasonMonths: number[] | undefined,
  nowMonth?: number,
): { hit: boolean; monthsAhead: number; peakLabel: string } {
  if (!seasonMonths || seasonMonths.length === 0 || !nowMonth) {
    return { hit: false, monthsAhead: 0, peakLabel: '' };
  }
  const peakLabel = seasonMonths
    .filter((m) => m >= 1 && m <= 12)
    .map((m) => MONTH_NAMES[m - 1])
    .join('·');

  for (let lead = SEASON_LEAD_MONTHS_MIN; lead <= SEASON_LEAD_MONTHS_MAX; lead++) {
    const target = ((nowMonth - 1 + lead) % 12) + 1;
    if (seasonMonths.includes(target)) {
      return { hit: true, monthsAhead: lead, peakLabel };
    }
  }
  return { hit: false, monthsAhead: 0, peakLabel };
}

// ----------------------------------------------------------------------------
// Public API
// ----------------------------------------------------------------------------

/**
 * PURE. Classify one candidate against all 7 discovery lenses + the red-ocean
 * warning lens. A candidate can match multiple lenses (design §3-0: "한 상품이
 * 여러 렌즈에 동시 해당 가능"). No I/O, no clock — same purity contract as
 * classifyRecommendationType() in naver/recommendation-type.ts.
 */
export function classifySourcingLenses(input: LensCandidateInput): LensClassification {
  const {
    d1, d2, d3, supplierPrice, shippingFee, trend, trendSignal, nowMonth,
    blueOceanScore, uniqueSellersInTop, competitionLevel,
  } = input;

  const score = computeCategoryScore({ d1, d2, d3, supplierPrice, shippingFee, trend });
  const advice = getMarginAdvice(d1, d2, d3);
  const matches: LensMatch[] = [];

  const push = (lens: SourcingLens, reasons: string[]) => {
    matches.push({ lens, ...LENS_META[lens], reasons });
  };

  // 📈 급상승 — trend-analyzer의 rising-rate 신호(로드맵 1b 신규).
  if (trendSignal?.isRising) {
    push('rising', [
      `최근 검색 트렌드가 ${trendSignal.risingRate}% 상승 중이에요 — 레드오션 되기 전에 선점하세요`,
    ]);
  }

  // 🗓️ 시즌 선점 — 급상승과 겹치지 않도록 "아직 이번달은 아닌" 리드 윈도우만.
  const season = seasonalLeadWindow(advice.seasonMonths, nowMonth);
  if (advice.isSeasonal && season.hit) {
    push('seasonal', [
      `${season.monthsAhead}개월 뒤 성수기(${season.peakLabel}) — 지금 미리 준비하면 시즌 피크에 이미 상위 노출돼요`,
    ]);
  }

  // 💎 니치 — 마진 안정 + 검색 과열 아님(경쟁 정보가 있으면 low 가점).
  if (score.roiScore >= STABLE_ROI && score.seoScore < HOT_SEO) {
    const reasons = ['경쟁 덜한 틈새 + 마진 안정 — 롱테일로 꾸준히 팔려요'];
    if (competitionLevel === 'low') reasons.push('경쟁 강도도 낮게 측정됐어요');
    push('niche', reasons);
  }

  // 🌊 블루오션 — 외부에서 계산된 blueOceanScore 재사용(재계산 금지, 로드맵1 소유).
  if (typeof blueOceanScore === 'number' && blueOceanScore >= 70) {
    push('blueOcean', [`블루오션 점수 ${blueOceanScore}점 — 수요는 있는데 경쟁은 낮아요`]);
  }

  // 🍯 꿀통(마진) — 검색 유리도와 무관하게 마진 자체가 우수.
  if (score.roiScore >= HONEYPOT_ROI) {
    push('honeypot', [`마진 매력도 ${score.roiScore}점 — 수익성만 보면 최우선 후보예요`]);
  }

  // 🏆 황금키워드 — 검색 高 AND 마진 高 (다른 렌즈와 중복 가능한 오버레이 태그).
  if (score.seoScore >= HOT_SEO && score.roiScore >= GOOD_ROI) {
    push('golden', [
      '검색 상승세 + 마진 매력적 — 지금 밀면 크게 터져요',
      `검색 유리도 ${score.seoScore} · 마진 매력도 ${score.roiScore}`,
    ]);
  }

  // 📚 스테디셀러 — trend-analyzer의 변동성 신호(로드맵 1b 신규).
  if (trendSignal?.isStable) {
    push('steady', [
      `검색 변동성 ${trendSignal.volatility}% — 트렌드 안 타고 꾸준히 팔리는 기본 라인이에요`,
    ]);
  }

  // ⚠️ 레드오션 — 발굴 렌즈가 아니라 경고. 다른 렌즈로 뽑힌 후보에만 의미가 있다.
  let redOceanWarning: RedOceanWarning | null = null;
  if (
    competitionLevel === 'high' &&
    typeof uniqueSellersInTop === 'number' &&
    uniqueSellersInTop >= RED_OCEAN_MIN_SELLERS
  ) {
    redOceanWarning = {
      ...RED_OCEAN_META,
      reasons: [
        `상위 노출에 이미 판매자 ${uniqueSellersInTop}곳 이상 몰려있어요 — 진입은 신중하게 (#327, 결정은 운영자)`,
      ],
    };
  }

  return { matches, redOceanWarning, score };
}

/** Summary counts for an embed header, e.g. "📈 급상승 2 · 🗓️ 시즌선점 2 · 🍯 꿀통 1". */
export function lensSummary(classifications: LensClassification[]): string {
  const counts = new Map<SourcingLens, number>();
  for (const c of classifications) {
    for (const m of c.matches) {
      counts.set(m.lens, (counts.get(m.lens) ?? 0) + 1);
    }
  }
  const order: SourcingLens[] = ['rising', 'seasonal', 'niche', 'blueOcean', 'honeypot', 'golden', 'steady'];
  return order
    .filter((l) => (counts.get(l) ?? 0) > 0)
    .map((l) => `${LENS_META[l].emoji} ${LENS_META[l].label} ${counts.get(l)}`)
    .join(' · ');
}

/** One candidate + its lens classification, for the allocator below. */
export interface LensAllocationCandidate<T> {
  item: T;
  id: string; // dedup key — a candidate picked for one lens can't fill another slot too
  classification: LensClassification;
  d1: string; // 대분류 — allocateByLens의 d1 다양성 게이트용(§3-2)
}

export interface LensAllocationResult<T> {
  selected: T[];
  byLens: Record<Exclude<SourcingLens, 'golden'>, T[]>;
  unfilledLenses: Array<{ lens: SourcingLens; short: number }>; // 정직한 미달 표시 (#325)
}

/**
 * PURE. Greedy allocation: for each primary lens (LENS_DAILY_QUOTA order),
 * fill its quota from candidates that matched that lens, highest totalScore
 * first, skipping candidates already used by an earlier lens (no duplicate
 * slots — a product picked for 급상승 doesn't also occupy the 니치 슬롯 even
 * if it matched both). Honest about shortfalls instead of silently returning
 * fewer than 10 (#325 — 정직한 미달성 표시).
 *
 * d1 다양성 게이트(docs/design/SOURCING_ZSCORE_NORMALIZATION_2026-08-27.md
 * §3-2): 전체 10슬롯 중 한 d1 대분류가 maxD1Share(기본 40% = 4슬롯)를 넘게
 * 차지하지 못하게 전 렌즈 통틀어 카운트한다. 상한에 걸려 quota를 못 채우면
 * 억지로 채우지 않고 unfilledLenses에 정직하게 표시한다(#325와 동일 원칙).
 */
export function allocateByLens<T>(
  candidates: Array<LensAllocationCandidate<T>>,
  quota: Record<Exclude<SourcingLens, 'golden'>, number> = LENS_DAILY_QUOTA,
  maxD1Share = 0.4,
): LensAllocationResult<T> {
  const used = new Set<string>();
  const byLens = {} as Record<Exclude<SourcingLens, 'golden'>, T[]>;
  const unfilledLenses: Array<{ lens: SourcingLens; short: number }> = [];
  const selected: T[] = [];

  const lensOrder = Object.keys(quota) as Array<Exclude<SourcingLens, 'golden'>>;
  const totalSlots = Object.values(quota).reduce((s, n) => s + n, 0);
  const d1Cap = Math.max(1, Math.ceil(totalSlots * maxD1Share));
  const d1Count = new Map<string, number>();

  for (const lens of lensOrder) {
    const want = quota[lens];
    const pool = candidates
      .filter((c) => !used.has(c.id) && c.classification.matches.some((m) => m.lens === lens))
      .sort((a, b) => b.classification.score.totalScore - a.classification.score.totalScore);

    const picked: Array<LensAllocationCandidate<T>> = [];
    for (const c of pool) {
      if (picked.length >= want) break;
      if ((d1Count.get(c.d1) ?? 0) >= d1Cap) continue; // d1 상한 도달 — 다음 후보로
      picked.push(c);
    }

    byLens[lens] = picked.map((c) => c.item);
    for (const c of picked) {
      used.add(c.id);
      d1Count.set(c.d1, (d1Count.get(c.d1) ?? 0) + 1);
      selected.push(c.item);
    }
    if (picked.length < want) {
      unfilledLenses.push({ lens, short: want - picked.length });
    }
  }

  return { selected, byLens, unfilledLenses };
}
