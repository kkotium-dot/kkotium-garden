// src/lib/automation/category-tone-mapper.ts
//
// Sprint 7-M2 Phase G8-ENGINE-Q3 — category x tone decision mapper (step 1 of
// the 2-step pickArtDirection).
//
// Authority: docs/research/KKOTIUM_ART_DIRECTION_RESEARCH_2026-05-29.md §8.
// The research is the 1st source; where the Q3 handoff TypeScript sketch and
// the research §8 table diverge, the research wins (handoff §6). The handoff's
// draft TrustSignal union used 'function'/'story'; the §8 table's nine rows map
// more faithfully to hygiene/spatial/fragrance/quality/style/safety/freshness/
// spec/grace, which is what we implement.
//
// 1st-order tone variable = the category's "trust signal" (what a Korean buyer
// treats as the basis of trust in that category). 2nd-order = persona x
// pricePosition, applied downstream in thumbnail-art-direction.ts. This module
// only decides the categorical directive; it carries a recommended colorMood +
// baseTone (not raw RGB) so palette derivation stays in one place
// (thumbnail-art-direction) and there is no circular import.
//
// Pure module: no IO, no external image API. Safe to unit-test.

import type { ConceptTone } from '../diagnosis/concept-tone-inference';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CategoryGroup =
  | 'kitchen'
  | 'homeliving'
  | 'automotive-fragrance'
  | 'beauty'
  | 'fashion'
  | 'kids'
  | 'food'
  | 'digital'
  | 'tradition-gift'
  | 'general';

/** What the buyer treats as the basis of trust in this category (research §8). */
export type TrustSignal =
  | 'hygiene'
  | 'spatial'
  | 'fragrance'
  | 'quality'
  | 'style'
  | 'safety'
  | 'freshness'
  | 'spec'
  | 'grace';

export type BaseTone =
  | 'modern-minimal'
  | 'kinfolk'
  | 'korean-traditional'
  | 'foreign-cinematic'
  // G8-ENGINE-Q4: warm natural-light fragrance read (Adobe workflow research §3).
  // Replaces the dark-cinematic read for automotive-fragrance — impressionist
  // labels + Korean diffuser mood (Jo Malone / Diptyque) are sunlit, not dark.
  | 'foreign-cinematic-sunlit'
  | 'pastel-friendly';

// Person policy (work-principle #47, 2026-06-04): anonymous human models are
// allowed where the concept benefits; identifiable real individuals / celebrities
// remain prohibited. Backgrounds stay no-human. This supersedes the prior
// "human faces are hard-prohibited system-wide" rule. 'model-allowed' is the new
// member used ONLY by the person-shot concept track — existing background
// GROUP_ROWS values below are intentionally left unchanged (unmanned backdrops).
export type ModelPolicy = 'no-human' | 'hand-only' | 'silhouette' | 'model-allowed';

export interface ToneDirective {
  categoryGroup: CategoryGroup;
  trustSignal: TrustSignal;
  baseTone: BaseTone;
  /** Recommended colorMood; thumbnail-art-direction resolves this into RGB. */
  colorMood: ConceptTone['colorMood'];
  modelPolicy: ModelPolicy;
  /** When true, a premium pricePosition should pull toward a darker/dressier
   *  read. Now false for automotive fragrance (Q4 sunlit retune). */
  darkPremium: boolean;
  /** G8-ENGINE-Q4: prefer a warm natural-light scene (sunlit wood desk / café
   *  window) over studio/dark. Drives the foreign-cinematic-sunlit palette. */
  naturalLight: boolean;
}

export interface MapCategoryToToneOptions {
  /** Free-text / canonical category (leaf preferred). Primary classifier. */
  category?: string | null;
  /** Naver numeric category code. Weak secondary hint (no full lookup table). */
  naverCategoryCode?: string | null;
  /** Product name — secondary keyword signal. */
  productName?: string | null;
}

// ---------------------------------------------------------------------------
// Category classification — Korean matching tokens (workrule #35 carve-out:
// these are matching tokens, not user-facing strings).
// ---------------------------------------------------------------------------

const GROUP_TOKENS: ReadonlyArray<readonly [CategoryGroup, readonly string[]]> = [
  ['automotive-fragrance', ['차량', '자동차', '송풍구', '디퓨저', '방향제', '차량용', '카', '향수']],
  ['tradition-gift', ['전통', '한지', '자개', '나전', '달항아리', '공예', '답례', '오동나무', '한옥']],
  ['kids', ['유아', '아기', '아동', '키즈', '어린이', '신생아', '베이비', '출산']],
  ['beauty', ['뷰티', '화장품', '스킨', '세럼', '크림', '에센스', '마스크팩', '코스메틱', '향장']],
  ['fashion', ['패션', '의류', '신발', '가방', '주얼', '액세서리', '잠옷', '언더웨어', '코디']],
  ['food', ['식품', '간식', '음료', '먹거리', '커피', '차', '건강식', '과자', '음식']],
  ['digital', ['디지털', '전자', '가전', '컴퓨터', '케이블', '충전', '이어폰', '스마트', '가젯']],
  ['kitchen', ['주방', '그릇', '밀폐', '용기', '컵', '조리', '얼음', '트레이', '도마', '식기', '주방용품']],
  ['homeliving', ['홈', '리빙', '인테리어', '가구', '수납', '데코', '조명', '도어벨', '생활', '소품']],
];

const FRAGRANCE_NAME_TOKENS = ['디퓨저', '방향제', '송풍구', '향'];

// Strong Korean-traditional product-name signals override the category bucket:
// research §4-C / §11-C treats 달항아리·자개·한지 as the 한국형 anchor, and the
// category text (e.g. "인테리어") under-describes them. Highly specific tokens,
// so the override risk is low.
const STRONG_TRADITION_NAME_TOKENS = ['달항아리', '자개', '나전', '한지', '한옥', '전통공예'];

function lower(s: string | null | undefined): string {
  return (s ?? '').toLowerCase();
}

function tokenHit(haystack: string, tokens: readonly string[]): boolean {
  const lc = haystack.toLowerCase();
  return tokens.some((t) => lc.includes(t.toLowerCase()));
}

/** Classify the category group from the category text first, then the product
 *  name, then fall back to 'general'. Ordered so more specific groups win
 *  (automotive/tradition/kids before the broad kitchen/homeliving buckets). */
function classifyGroup(opts: MapCategoryToToneOptions): CategoryGroup {
  const cat = lower(opts.category);
  const name = lower(opts.productName);
  // Strongest signal first: a distinctive Korean-traditional product name wins
  // over the category bucket (a 달항아리 도어벨 filed under 인테리어 is still 한국형).
  if (tokenHit(name, STRONG_TRADITION_NAME_TOKENS)) return 'tradition-gift';
  for (const [group, tokens] of GROUP_TOKENS) {
    if (tokenHit(cat, tokens)) return group;
  }
  // Product-name fallback only for the strongest discriminators, so a generic
  // name token does not override an explicit category.
  if (tokenHit(name, FRAGRANCE_NAME_TOKENS)) return 'automotive-fragrance';
  for (const [group, tokens] of GROUP_TOKENS) {
    if (tokenHit(name, tokens)) return group;
  }
  return 'general';
}

// ---------------------------------------------------------------------------
// §8 decision rows — group -> categorical directive (pre persona/price).
// ---------------------------------------------------------------------------

interface GroupRow {
  trustSignal: TrustSignal;
  baseTone: BaseTone;
  /** baseTone override when pricePosition === 'premium'. */
  premiumBaseTone?: BaseTone;
  /** Preferred colorMood when the diagnosis colorMood is absent/neutral. */
  defaultMood: ConceptTone['colorMood'];
  modelPolicy: ModelPolicy;
  darkPremium: boolean;
  /** Defaults to false when omitted in a row. */
  naturalLight?: boolean;
}

const GROUP_ROWS: Record<CategoryGroup, GroupRow> = {
  // 주방/생활 — 위생·실사용·크기 / 모던 미니멀 화이트 / warm-calm / 손만
  kitchen: { trustSignal: 'hygiene', baseTone: 'modern-minimal', defaultMood: 'warm', modelPolicy: 'hand-only', darkPremium: false },
  // 홈리빙/인테리어 — 공간 연출·여백 / 킨포크 (premium=한국형) / calm-mono / 무
  homeliving: { trustSignal: 'spatial', baseTone: 'kinfolk', premiumBaseTone: 'korean-traditional', defaultMood: 'calm', modelPolicy: 'no-human', darkPremium: false },
  // 차량/디퓨저 — 향의 무드 / 자연광 햇살(인상주의 라벨 정합, Q4 톤 전환) / warm / 무
  'automotive-fragrance': { trustSignal: 'fragrance', baseTone: 'foreign-cinematic-sunlit', defaultMood: 'warm', modelPolicy: 'no-human', darkPremium: false, naturalLight: true },
  // 뷰티 — 질감·제형·임상 / 킨포크+클린 화이트 / calm-warm / 손·피부
  beauty: { trustSignal: 'quality', baseTone: 'kinfolk', defaultMood: 'calm', modelPolicy: 'hand-only', darkPremium: false },
  // 패션 — 핏·코디·무드 / 킨포크 에디토리얼 / vivid-warm / AI는 무인(실모델 외주)
  fashion: { trustSignal: 'style', baseTone: 'kinfolk', defaultMood: 'warm', modelPolicy: 'no-human', darkPremium: false },
  // 유아동 — 안전·친근 / 친근 밝은 파스텔 / warm / 손·아이 뒷모습
  kids: { trustSignal: 'safety', baseTone: 'pastel-friendly', defaultMood: 'warm', modelPolicy: 'hand-only', darkPremium: false },
  // 식품 — 신선·식욕 / 따뜻 고채도(킨포크 내추럴) / warm-vivid / 무
  food: { trustSignal: 'freshness', baseTone: 'kinfolk', defaultMood: 'warm', modelPolicy: 'no-human', darkPremium: false },
  // 디지털 — 스펙·정밀 / 모던 미니멀 다크-화이트 / mono-calm / 무
  digital: { trustSignal: 'spec', baseTone: 'modern-minimal', defaultMood: 'mono', modelPolicy: 'no-human', darkPremium: true },
  // 전통/선물 — 격·이야기 / 한국형 / calm-mono / 무
  'tradition-gift': { trustSignal: 'grace', baseTone: 'korean-traditional', defaultMood: 'calm', modelPolicy: 'no-human', darkPremium: false },
  // general fallback — neutral modern minimal. defaultMood=warm preserves the
  // pre-Q3 "no ConceptTone -> warm" behavior for the safety/test path.
  general: { trustSignal: 'quality', baseTone: 'modern-minimal', defaultMood: 'warm', modelPolicy: 'no-human', darkPremium: false },
};

// ---------------------------------------------------------------------------
// Public entry
// ---------------------------------------------------------------------------

/**
 * Map a diagnosis ConceptTone + category context to a categorical ToneDirective
 * (research §8). The diagnosis colorMood is preserved when present (it carries
 * real image statistics); the category supplies baseTone / modelPolicy /
 * darkPremium / trustSignal. Persona + pricePosition modulation happens in
 * thumbnail-art-direction.applyPersonaModulation.
 */
export function mapCategoryToTone(
  conceptTone: ConceptTone | null | undefined,
  opts: MapCategoryToToneOptions = {},
): ToneDirective {
  const categoryGroup = classifyGroup(opts);
  const row = GROUP_ROWS[categoryGroup];

  const premium = conceptTone?.pricePosition === 'premium';
  const baseTone = premium && row.premiumBaseTone ? row.premiumBaseTone : row.baseTone;

  // Preserve diagnosis colorMood when available; otherwise the §8 default.
  const colorMood = conceptTone?.colorMood ?? row.defaultMood;

  return {
    categoryGroup,
    trustSignal: row.trustSignal,
    baseTone,
    colorMood,
    modelPolicy: row.modelPolicy,
    darkPremium: row.darkPremium,
    naturalLight: row.naturalLight ?? false,
  };
}
