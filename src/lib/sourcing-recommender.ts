// src/lib/sourcing-recommender.ts
// E-7: Kkotti Sourcing Recommender Bot
// Analyzes Naver trends + keyword stats + competition data
// to recommend blue-ocean product opportunities for sourcing
// Runs daily via cron and pushable to Discord #kkotti-daily

import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { sendDiscord } from '@/lib/discord';
import { fetchNaverTrends, fetchCategoryTrendSignals, type TrendResult, type CategoryTrendSignal } from '@/lib/trend-analyzer';
import {
  classifySourcingLenses,
  allocateByLens,
  LENS_DAILY_QUOTA,
  LENS_META,
  type SourcingLens,
  type LensAllocationCandidate,
  type RedOceanWarning,
} from '@/lib/sourcing-lenses';
import type { KeywordStat } from '@/lib/naver/keyword-api';
import { fetchKeywordVolumes, fetchRelatedKeywords, type CompIdx } from '@/lib/naver/searchad-volume';
import { resolveSourcingSeeds } from '@/lib/naver/seed-keywords';
import { applyDropshipFitness } from '@/lib/policy/dropship-fitness';
import { getCachedTrend, buildD1Key, type CategoryTrendEntry } from '@/lib/naver/category-trend-cache';

// P0-3 (2026-08-20): local shape carrying SearchAd's plAvgDepth alongside the
// existing KeywordStat fields — used as a continuous competition-strength
// signal in calcBlueOceanScore (compIdx alone buckets into only 3 tiers,
// which was collapsing distinct keywords onto identical scores).
type KeywordVolumeStat = KeywordStat & { plAvgDepth: number | null };

function mapCompIdx(c: CompIdx | null): KeywordStat['competition'] {
  return c === 'LOW' ? 'low' : c === 'MEDIUM' ? 'mid' : c === 'HIGH' ? 'high' : 'unknown';
}
import { matchWholesaleProducts, type WholesaleProduct } from '@/lib/wholesale-matcher';
import { recoTypeSummary, type RecoTypeTag } from '@/lib/naver/recommendation-type';
import { resolveRecoTypeTags } from '@/lib/naver/reco-type-resolver';
import { judgeExclusion } from '@/lib/policy/exclusion-rules';
import { pickVariant, seasonalGreeting } from '@/lib/notifications/kkotti-variation';
import { callGroq } from '@/lib/ai/groq';
import { matchDeterministicCategories } from '@/lib/naver/category-deterministic-matcher';

// ── Types ────────────────────────────────────────────────────────────────────

export interface SourcingOpportunity {
  keyword: string;
  // UCE 연동(구현 B, §3-4): 표시·저장용 카테고리 라벨 — 결정론적 매처
  // (matchDeterministicCategories)의 top 결과. 렌즈 판정용 트렌드 d1과는
  // 다른 신호이므로 섞지 않는다(아래 trendD1 참조).
  category: string;
  // 렌즈 판정·z-score 신호 조회 전용 d1 — DataLab 10대분류 어휘(트렌드
  // 키워드 매칭). classifySourcingLenses/signalByD1/trendByD1/allocateByLens
  // d1게이트는 반드시 이 필드를 써야 한다(category를 쓰면 UCE의 전체
  // taxonomy 어휘와 안 맞아 신호 조회가 조용히 실패한다).
  trendD1: string;
  monthlySearchVolume: number;
  competition: 'low' | 'mid' | 'high' | 'unknown';
  // P0-3 (2026-08-20): null (not 0) when unknown — 쇼핑검색 API 종료로
  // 이 값들은 실측 불가능하다. 0은 "가격 0원"처럼 보이는 가짜값이므로 UI에서
  // null을 명시적으로 숨겨야 한다 (0으로 채우지 말 것).
  avgPrice: number | null;
  minPrice: number | null;
  maxPrice: number | null;
  totalResults: number | null;
  competitionLevel: string;
  suggestedSupplyPrice: number;
  estimatedMargin: number;
  blueOceanScore: number; // 0~100
  reason: string;
  topSellers: string[];
  aiInsight?: string;
  // E-8: Wholesale matches from DMK/DMM
  wholesaleMatches?: WholesaleProduct[];
  wholesalePlatforms?: string[];
  // SOURCING_NEGATIVE_MARGIN_ROOT_CAUSE(2026-08-04): 마진(%) 대신 실측 공급가
  // 범위만 노출한다 — avgPrice 기반 마진 역산은 이종상품 오염 위험으로 폐기.
  supplyPriceRange?: { min: number; max: number };
  // E-10: Entry barrier analysis (Option A - indirect estimation)
  entryBarrierLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
  entryBarrierScore?: number;       // 0~5 (5 = highest barrier)
  entryBarrierBonus?: number;       // -10, 0, or +15 applied to BlueOcean
  // #250 §3: 꼬띠 추천 유형 태그 (황금🏆/니치💎/시즌🗓️) — resolved by the route.
  recoType?: RecoTypeTag | null;
  blueOceanBase?: number;           // Score before entry barrier bonus
  uniqueSellersInTop?: number;      // unique mallNames in top results
  priceSpread?: number;             // (max-min)/avg, rounded to 2 decimals
  // 트랙C-1(2026-08-05, SOURCING_NAKJEOM_PIPELINE): 낙점 상태 관리. GET이
  // db-full(SourcingOpportunityRecord)에서 채워 내려준다 — 위젯이 상태 칩을
  // 표시하고 PATCH 대상을 식별하는 데 쓴다. 스캔 생성 시점엔 없다(undefined).
  recordId?: string;
  operatorStatus?: 'interested' | 'sourcing_started' | 'skipped' | null;
  // 렌즈 통일(2026-08-27, #295): sourcing-lenses.ts classifySourcingLenses()
  // 결과를 그대로 붙인다(위젯 배지·디스코드 요약용) — 판정 로직은 여기서
  // 다시 만들지 않는다. fresh scan에서만 채워짐 — db 재구성 경로(db-full/
  // db-cache)는 blueOceanBase 등 기존 enrichment 필드와 동일하게 생략한다
  // (#325 정직한 부분 enrichment, DB 컬럼 추가는 이번 스코프 밖).
  lensMatches?: { lens: SourcingLens; emoji: string; label: string }[];
  redOceanWarning?: RedOceanWarning | null;
}

export interface SourcingRecommendResult {
  date: string;
  trendSource: string;
  trendCategories: string[];
  opportunities: SourcingOpportunity[];
  aiSummary?: string;
  error?: string;
  // P1 — 취급 제외 정책 통계 (dry-run 확인용, #55·#62)
  excludedCount?: number;
  excludedSamples?: { keyword: string; reason: string }[];
  // P1-E — 무음 실패 제거(#270): 삼킨 오류를 카운트해 결과에 노출한다.
  keywordStatFailures?: number;
  competitionAnalysisFailures?: number;
  wholesaleMatchFailures?: number;
  // P0-4 (2026-08-20) → 렌즈 통일(2026-08-27): 유형별 슬롯. opportunities
  // 배열은 하위호환을 위해 그대로 유지(위젯·weekly-report가 의존) — slots는
  // 추가 필드다.
  slots?: SourcingSlot[];
  seedSource?: 'product_seed' | 'category_fallback';
}

// ── 유형별 슬롯 — sourcing-lenses.ts 단일 권위(#295, 2026-08-27) ────────────────
// 여기서 렌즈 이름을 다시 정의하지 않는다 — SourcingLens를 그대로 재수출한다.
// 구 SlotType('trending'·'blue_ocean' 5종)은 폐기, SourcingLens 7종으로 통일
// (rising·seasonal·niche·blueOcean·honeypot·golden·steady).
export type SlotType = SourcingLens;

export const SLOT_LABELS: Record<SlotType, string> = Object.fromEntries(
  (Object.keys(LENS_META) as SourcingLens[]).map((lens) => [lens, `${LENS_META[lens].label} ${LENS_META[lens].emoji}`]),
) as Record<SlotType, string>;

export interface SourcingSlot {
  type: SlotType;
  // quota만큼(0~n) — 부족하면 그만큼만 채우고 억지로 채우지 않는다(운영자 지침).
  opportunities: SourcingOpportunity[];
  quota: number;
  pending: boolean; // quota 미달이면 true (#325 정직한 미달 표시)
  pendingMessage?: string;
  // 대표(첫 opportunity) 기준 레드오션 경고 — 발굴 렌즈가 아니라 배지용(#327).
  redOceanWarning?: RedOceanWarning | null;
}

// ── Category-to-keyword expansion map (P1-E) ─────────────────────────────────
// DataLab이 반환하는 한글 D1 카테고리명(trend-analyzer.ts DATALAB_CATEGORIES와
// 동일한 10개 이름)을 키로 하는 상시층 상품 키워드 사전. 카테고리명 자체는
// 검색량이 없어(>=300 필터에서 전량 탈락 — CURRENT.md §1-1 근거 7) 실제 상품
// 키워드로 확장해야 후보가 만들어진다.
//
// 취급 제외 정책 준수(#262·policy/exclusion-rules.ts): 식품·화장품/미용은
// 카테고리 자체가 취급 제외 대상이라 상품 키워드를 배정하지 않는다(브랜드
// 키워드도 금지 — 아래 목록에 브랜드명 없음).
const KW: Record<string, string[]> = {
  '가구/인테리어': [
    '수납장', '원목선반', '행거', '커튼', '러그', '무드등', '스탠드조명',
    '소파커버', '매트리스커버', '식탁매트', '벽시계', '액자', '방석', '협탁',
    '신발장', '정리함', '옷걸이', '침대프레임', '화장대', '거울',
  ],
  '생활/건강': [
    '청소기', '공기청정기', '가습기', '제습기', '안마기', '체중계', '혈압계',
    '마사지건', '발마사지기', '온열매트', '전기요', '선풍기', '서큘레이터',
    '다리미', '스팀다리미', '빨래건조대', '욕실화', '샤워필터', '정수기필터',
  ],
  '여가/생활편의': [
    '캠핑의자', '캠핑테이블', '텐트', '랜턴', '아이스박스', '돗자리', '우산',
    '우비', '보조배터리', '캐리어', '여행파우치', '목베개', '안대', '캠핑매트',
    '폴딩박스', '타프', '화로대', '등산스틱', '낚시의자',
  ],
  '디지털/가전': [
    '이어폰', '무선충전기', '블루투스스피커', '케이블', '멀티탭', 'USB허브',
    '웹캠', '마우스', '키보드', '모니터받침대', '핸드폰거치대', '미니선풍기',
    '전기포트', '토스터기', '에어프라이어', '믹서기', 'LED조명', '무선청소기',
  ],
  '출산/육아': [
    '기저귀갈이대', '젖병소독기', '유아매트', '아기욕조', '유모차커버', '카시트',
    '아기띠', '이유식용기', '딸랑이', '모빌', '아기베개', '수유쿠션',
    '물티슈케이스', '아기옷걸이', '안전문', '콘센트커버', '목욕타월', '놀이매트',
  ],
  '스포츠/레저': [
    '요가매트', '폼롤러', '덤벨', '짐볼', '마사지볼', '러닝벨트', '스포츠타월',
    '물병', '운동장갑', '줄넘기', '자전거헬멧', '등산배낭', '수영모자',
    '물안경', '골프장갑', '테니스라켓커버', '배드민턴채',
  ],
  '패션잡화': [
    '크로스백', '파우치', '지갑', '벨트', '모자', '장갑', '목도리', '양말',
    '선글라스', '여행가방', '백팩', '에코백', '카드지갑', '헤어핀', '머리끈',
    '스카프', '넥워머',
  ],
  '패션의류': [
    '니트', '후드티', '맨투맨', '레깅스', '잠옷', '실내복', '가디건', '조끼',
    '티셔츠', '반팔티', '트레이닝복', '이너웨어', '양말세트', '잠옷세트',
    '홈웨어', '언더셔츠',
  ],
  // 취급 제외 카테고리 — 상품 키워드 미배정(정책 확정)
  '식품': [],
  '화장품/미용': [],
};

// 조합층: 씨앗어 × 수식어(원룸/1인가구/차량용/접이식/대용량 등) — 검색 폭 확장
// + 매일 다른 조합으로 변주. 상시층 풀(15~20개)에서 날짜 기반으로 순환 선택.
const SEASONAL_MODIFIERS = ['원룸', '1인가구', '차량용', '접이식', '대용량', '미니', '휴대용', '벽걸이'];

// 성능: 카테고리별 반환 키워드 상한(#4) — 상시층 풀은 15~20개로 유지하되
// 실제 검색량 조회 대상은 카테고리당 이 개수로 제한한다.
const MAX_KEYWORDS_PER_CATEGORY = 12;

// Generate search keywords from trending category names
function expandCategoryToKeywords(categoryName: string): string[] {
  const base = KW[categoryName];
  if (!base || base.length === 0) {
    // Fallback: use the category name as-is (식품/화장품·미확인 카테고리는
    // 어차피 judgeExclusion()에서 걸러지거나 검색량 필터에서 탈락한다)
    return [categoryName];
  }

  const evergreenCount = Math.max(0, MAX_KEYWORDS_PER_CATEGORY - 2);
  const evergreen = base.slice(0, evergreenCount);

  // 날짜 기반 인덱스로 매일 다른 씨앗어×수식어 조합 2개 추가
  const dayIndex = Math.floor(Date.now() / 86_400_000);
  const combo: string[] = [];
  for (let i = 0; i < 2 && i < base.length; i++) {
    const seed = base[(dayIndex + i) % base.length];
    const modifier = SEASONAL_MODIFIERS[(dayIndex + i) % SEASONAL_MODIFIERS.length];
    // 네이버 검색광고 keywordstool의 hintKeywords는 공백 포함 시 400
    // (BAD_REQUEST 11001)을 반환해 배치 전체가 실패한다 — 공백 없이 붙인다.
    combo.push(`${modifier}${seed}`);
  }

  return [...new Set([...evergreen, ...combo])].slice(0, MAX_KEYWORDS_PER_CATEGORY);
}

// ── Blue Ocean Score Calculator ──────────────────────────────────────────────
// Higher = better opportunity
// SE05(#324): 네이버 쇼핑검색 API 영구 종료로 totalResults·avgPrice를 더 이상
// 얻을 수 없다. 두 값은 optional로 두고, 없으면(undefined) 해당 항목의 점수
// 기여를 생략한다 — 모르는 값을 0/미확인으로 채워 가짜 신호를 주지 않는다
// (docs/design/NAVER_SHOPPING_API_SUNSET_RESPONSE.md §4 "가짜값 채우기 금지").
// 블루오션 판정은 검색량 + 검색광고 competition(low/mid/high)만으로 산출된다.
function calcBlueOceanScore(params: {
  monthlyVolume: number;
  competition: string;
  totalResults?: number;
  avgPrice?: number;
  /** SearchAd plAvgDepth (avg ad placement depth) — continuous secondary
   *  competition signal. compIdx alone only has 3 buckets, which collapses
   *  distinct keywords onto identical scores; this breaks ties within a
   *  bucket. Higher depth = more advertisers bidding = more contested. */
  plAvgDepth?: number | null;
}): number {
  let score = 50; // base

  // Search volume sweet spot: 1,000~10,000/month = ideal
  // 2026-08-05 초레드오션 감점 강화: 10만 건 초과는 대기업·브랜드 각축장이라
  // 1인 새싹셀러가 진입하기 어렵다(실측: "제습기" 월 43만·"청소기" 월 9만은
  // 블루오션이 아니라 레드오션). 검색량이 많다고 무조건 좋은 게 아니라 "적당한
  // 검색량 + 낮은 경쟁"이 진짜 블루오션이므로 초대형 검색량을 강하게 감점한다.
  const vol = params.monthlyVolume;
  if (vol >= 1000 && vol < 5000) score += 25;       // sweet spot
  else if (vol >= 5000 && vol < 10000) score += 20;  // good
  else if (vol >= 500 && vol < 1000) score += 15;    // niche
  else if (vol >= 10000 && vol < 30000) score += 10;  // crowded but volume
  else if (vol >= 30000 && vol < 100000) score += 3;  // very crowded
  else if (vol >= 100000) score -= 20;                 // 초레드오션(대기업 각축장)
  else if (vol < 500 && vol > 0) score += 10;          // very niche
  else score -= 10;                                     // no data

  // Competition: low = great, high = bad (검색광고 keywordstool, 살아있음)
  if (params.competition === 'low') score += 20;
  else if (params.competition === 'mid') score += 10;
  else if (params.competition === 'high') score -= 5;

  // plAvgDepth: continuous tiebreaker within a compIdx bucket (0~15+ ad slots
  // typically bid). Higher depth = more advertiser demand = more contested,
  // so it nudges the score down proportionally instead of leaving keywords
  // in the same compIdx bucket tied at an identical score.
  if (typeof params.plAvgDepth === 'number') {
    score -= Math.min(10, Math.round(params.plAvgDepth / 2));
  }

  // Total search results: fewer = less competition (unavailable since SE05 — skip)
  if (params.totalResults !== undefined) {
    if (params.totalResults < 1000) score += 15;
    else if (params.totalResults < 5000) score += 10;
    else if (params.totalResults < 30000) score += 5;
    else if (params.totalResults > 100000) score -= 10;
  }

  // Price range: 10,000~50,000 = optimal for home goods margin (unavailable since SE05 — skip)
  if (params.avgPrice !== undefined) {
    if (params.avgPrice >= 10000 && params.avgPrice <= 50000) score += 10;
    else if (params.avgPrice >= 5000 && params.avgPrice < 10000) score += 5;
    else if (params.avgPrice > 50000 && params.avgPrice <= 100000) score += 3;
  }

  return Math.max(0, Math.min(100, score));
}

// ── 유형별 슬롯 선별 — sourcing-lenses.ts 단일 권위 배선(#295, 2026-08-27) ──────
// F3 해소: classifySourcingLenses()·allocateByLens()·LENS_DAILY_QUOTA는
// 로드맵 1b(rev118)에서 만들어졌지만 지금까지 아무 cron/route도 호출하지
// 않는 죽은 코드였다. 이 함수 하나가 그 진입점이다 — 여기서 렌즈 판정
// 로직을 다시 만들지 않고 순수하게 위임만 한다.

/** blueOcean·honeypot처럼 여러 후보가 quota를 다투는 슬롯 내부에서, 이미
 *  선택된 후보들 사이의 표시 순서만 드롭십 적합도로 재정렬한다(차단 아님,
 *  감점 — exclusion-rules.ts와 분리 유지). allocateByLens의 선정 자체는
 *  CategoryScore.totalScore 기준이라 이건 "누가 뽑히는가"가 아니라
 *  "뽑힌 후보 중 무엇을 먼저 보여줄까"만 바꾼다. */
function reorderByDropshipFitness(items: SourcingOpportunity[]): SourcingOpportunity[] {
  return [...items].sort(
    (a, b) => applyDropshipFitness(b.blueOceanScore, b.category) - applyDropshipFitness(a.blueOceanScore, a.category),
  );
}

export async function assignSourcingSlots(pool: SourcingOpportunity[]): Promise<SourcingSlot[]> {
  const nowMonth = new Date().getMonth() + 1;

  // D1별 급상승/스테디 신호 — fetchCategoryTrendSignals()를 이번에 처음 실제
  // 호출한다(이전엔 정의만 있고 호출부가 없었다, F3).
  const trendSignals = await fetchCategoryTrendSignals().catch(() => [] as CategoryTrendSignal[]);
  const signalByD1 = new Map(trendSignals.map((s) => [s.name, s]));

  // D-fix(2026-08-27): category-trend-cache의 D1 SEO trend를 후보군 전체에서
  // 딱 1회만 프리페치한다(N+1 금지) — 이게 없으면 classifySourcingLenses에
  // trend:null이 고정 주입돼 seoScore가 50으로 눌려 🏆황금·📈급상승(SEO 경로)이
  // 절대 발화하지 못하는 죽은 렌즈가 된다.
  // UCE 연동(§3-4) 이후 category는 UCE 라벨(전체 taxonomy)이라 DataLab
  // 10대분류 어휘를 쓰는 trend-cache/신호 조회에는 trendD1을 써야 한다
  // (category를 쓰면 조회가 조용히 실패한다).
  const uniqueD1s = [...new Set(pool.map((opp) => opp.trendD1))];
  const trendEntries = await Promise.all(
    uniqueD1s.map((d1) => getCachedTrend(buildD1Key(d1)).catch(() => null)),
  );
  const trendByD1 = new Map<string, CategoryTrendEntry | null>(
    uniqueD1s.map((d1, i) => [d1, trendEntries[i]]),
  );

  const candidates: LensAllocationCandidate<SourcingOpportunity>[] = pool.map((opp) => {
    const classification = classifySourcingLenses({
      d1: opp.trendD1,
      d2: '',
      d3: '',
      // Step 6(도매매칭) 이전 시점이라 suggestedSupplyPrice는 아직 0일 수
      // 있다 — 0을 실제 도매가처럼 넘기지 않고 미지값(null)으로 처리한다.
      supplierPrice: opp.suggestedSupplyPrice || null,
      trend: trendByD1.get(opp.trendD1) ?? null,
      trendSignal: signalByD1.get(opp.trendD1) ?? null,
      nowMonth,
      blueOceanScore: opp.blueOceanScore,
      uniqueSellersInTop: opp.uniqueSellersInTop ?? null,
      competitionLevel: opp.competition,
    });

    // 위젯 배지·디스코드 렌즈요약용으로 분류 결과를 opportunity에 그대로
    // 붙인다 — 여기서 별도 배지 판정을 다시 만들지 않는다(#295).
    opp.lensMatches = classification.matches.map((m) => ({ lens: m.lens, emoji: m.emoji, label: m.label }));
    opp.redOceanWarning = classification.redOceanWarning;

    // allocateByLens의 d1 다양성 게이트(§3-2)도 렌즈 신호와 같은 트렌드 d1
    // 기준 — category(UCE)를 쓰면 카테고리 어휘가 갈려 게이트 의미가 없어진다.
    return { item: opp, id: opp.keyword, classification, d1: opp.trendD1 };
  });

  const { byLens, unfilledLenses } = allocateByLens(candidates, LENS_DAILY_QUOTA);
  const shortByLens = new Map(unfilledLenses.map((u) => [u.lens, u.short]));

  const quotaLenses = Object.keys(LENS_DAILY_QUOTA) as Array<Exclude<SourcingLens, 'golden'>>;
  const slots: SourcingSlot[] = quotaLenses.map((lens) => {
    let opportunities = byLens[lens] ?? [];
    if (lens === 'blueOcean' || lens === 'honeypot') {
      opportunities = reorderByDropshipFitness(opportunities);
    }
    const quota = LENS_DAILY_QUOTA[lens];
    const short = shortByLens.get(lens) ?? 0;
    return {
      type: lens,
      opportunities,
      quota,
      pending: short > 0,
      pendingMessage: opportunities.length === 0
        ? `오늘은 ${LENS_META[lens].label} 조건을 충족하는 후보가 없습니다.`
        : short > 0
          ? `${LENS_META[lens].label} 후보 ${opportunities.length}/${quota}건만 확보됐습니다.`
          : undefined,
      redOceanWarning: opportunities.find((o) => o.redOceanWarning)?.redOceanWarning ?? null,
    };
  });

  // 🏆 황금키워드 — 전용 quota가 없는 오버레이 렌즈(설계 §3-0: 다른 렌즈와
  // 중복 가능한 "대형 기회" 태그). 전체 후보 중 golden 매치 + totalScore
  // 최고 1건을 대표로 노출한다(이미 다른 슬롯에 뽑혔어도 무관 — 오버레이).
  const goldenTop = candidates
    .filter((c) => c.classification.matches.some((m) => m.lens === 'golden'))
    .sort((a, b) => b.classification.score.totalScore - a.classification.score.totalScore)[0];
  slots.push({
    type: 'golden',
    opportunities: goldenTop ? [goldenTop.item] : [],
    quota: 1,
    pending: !goldenTop,
    pendingMessage: goldenTop ? undefined : '오늘은 황금키워드(검색+마진 모두 高) 조건을 충족하는 후보가 없습니다.',
    redOceanWarning: goldenTop?.item.redOceanWarning ?? null,
  });

  return slots;
}

// ── Groq AI Insight Generator ────────────────────────────────────────────────
async function generateAiInsight(
  opportunities: SourcingOpportunity[],
  trendCategories: string[]
): Promise<{ summary: string; perItem: Map<string, string> }> {
  const groqKey = process.env.GROQ_API_KEY;
  const fallback = {
    summary: '',
    perItem: new Map<string, string>(),
  };

  if (!groqKey || opportunities.length === 0) return fallback;

  const top5 = opportunities.slice(0, 5);
  const itemList = top5.map((o, i) =>
    `${i + 1}. "${o.keyword}" - monthly ${o.monthlySearchVolume}, competition ${o.competition}, blueOcean ${o.blueOceanScore}/100`
  ).join('\n');

  const prompt = `You are a Korean Naver Smart Store sourcing expert. Analyze these blue-ocean product opportunities and give actionable sourcing advice.

Trending categories today: ${trendCategories.join(', ')}

Top opportunities:
${itemList}

IMPORTANT CONTEXT: For each item, real wholesale supplier links (from Domeggook/Domemae) have ALREADY been found and will be shown directly below your tip in the same message. Do NOT suggest "find a supplier" or "look for alternatives elsewhere" — that contradicts the links already shown. Instead, give a tip about THIS SPECIFIC keyword: what to check before ordering (packaging, minimum order quantity, seller reviews), how to differentiate the listing, or a pricing/margin consideration. Keep each tip concrete and specific to that keyword, not generic sourcing advice.

Respond ONLY in Korean JSON (no markdown, no backticks):
{
  "summary": "2-3 sentence overall sourcing strategy for today",
  "items": [
    {"keyword": "keyword1", "tip": "1 sentence specific sourcing tip"},
    {"keyword": "keyword2", "tip": "1 sentence specific sourcing tip"}
  ]
}`;

  try {
    // UCE-2 fix (2026-08-27): this used to hand-roll its own fetch with
    // model 'llama-3.1-8b-instant' — Groq removed that model from its
    // catalog entirely (404 on every call, silently swallowed by the
    // `!res.ok` fallback below, so this AI insight has likely been a no-op
    // for a while). Switched to the shared callGroq() helper (groq.ts),
    // which uses the current model (openai/gpt-oss-120b) + reasoning_effort:
    // 'low' — also removes the need to duplicate key round-robin here.
    const text = await callGroq(prompt);
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return fallback;

    const parsed = JSON.parse(jsonMatch[0]);
    const perItem = new Map<string, string>();
    if (Array.isArray(parsed.items)) {
      for (const item of parsed.items) {
        if (item.keyword && item.tip) perItem.set(item.keyword, item.tip);
      }
    }
    return {
      summary: parsed.summary ?? '',
      perItem,
    };
  } catch {
    return fallback;
  }
}

// ── Main Sourcing Recommendation Engine ──────────────────────────────────────
export async function generateSourcingRecommendations(): Promise<SourcingRecommendResult> {
  const today = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
  });

  try {
    // Step 1: Get trending categories from DataLab — P0-4(2026-08-20)부터는
    // 후보 발굴이 아니라 시즌성·급상승 판정의 보조 신호로만 쓴다(설계안 승인).
    const trends: TrendResult = await fetchNaverTrends();
    const trendCategories = trends.trendCategories.length > 0
      ? trends.trendCategories
      : ['가구/인테리어']; // default for KKOTIUM

    // Step 2 (P0-4): 취급 씨앗(Product 파생 + 운영자 등록) → 검색광고
    // 연관확장(fetchRelatedKeywords, 최대 120건, 이미 검색량·compIdx·
    // plAvgDepth 포함)이 1차 후보 소스다. 씨앗이 없거나(신규 스토어) 검색광고
    // 응답이 비면 기존 DataLab 카테고리 확장으로 폴백한다 — 조용히 빈 결과를
    // 내지 않는다.
    let keywordStats: KeywordVolumeStat[] = [];
    let keywordStatFailures = 0;
    let seedSource: 'product_seed' | 'category_fallback' = 'category_fallback';

    const seeds = await resolveSourcingSeeds();
    if (seeds.length > 0) {
      const related = await fetchRelatedKeywords(seeds.map(s => s.keyword), { maxRows: 120 });
      if (related === null) {
        keywordStatFailures = seeds.length;
      } else if (related.length > 0) {
        seedSource = 'product_seed';
        keywordStats = related.map(row => ({
          keyword: row.keyword,
          pcMonthly: row.monthlyPcQc,
          mobileMonthly: row.monthlyMobileQc,
          totalMonthly: row.totalMonthlyQc,
          competition: mapCompIdx(row.compIdx),
          compIdx: row.compIdx ?? '',
          plAvgDepth: row.plAvgDepth,
        }));
      }
    }

    if (keywordStats.length === 0) {
      // Fallback: legacy DataLab category expansion path.
      const candidateKeywords: string[] = [];
      for (const cat of trendCategories) {
        candidateKeywords.push(...expandCategoryToKeywords(cat));
      }
      candidateKeywords.push(...trends.trendKeywords.slice(0, 5));
      const uniqueKeywords = [...new Set(candidateKeywords)].slice(0, 15);

      if (uniqueKeywords.length === 0) {
        return {
          date: today,
          trendSource: trends.source,
          trendCategories,
          opportunities: [],
          error: 'No candidate keywords found from seeds or trend data',
        };
      }

      // (P0-3, 2026-08-20): fetchKeywordVolumes — same searchad-volume.ts
      // wrapper as the seed path, with honest "< 10" and env-missing handling.
      const volumeRows = await fetchKeywordVolumes(uniqueKeywords);
      keywordStatFailures = volumeRows === null ? uniqueKeywords.length : 0;
      keywordStats = (volumeRows ?? []).map(row => ({
        keyword: row.keyword,
        pcMonthly: row.monthlyPcQc,
        mobileMonthly: row.monthlyMobileQc,
        totalMonthly: row.totalMonthlyQc,
        competition: mapCompIdx(row.compIdx),
        compIdx: row.compIdx ?? '',
        plAvgDepth: row.plAvgDepth,
      }));
    }

    // Step 4: Analyze competition for promising keywords
    // Filter: monthly volume >= 300, prefer low/mid competition
    // P0-4(2026-08-20): cap raised 8 → 24 — 5개 유형 슬롯(assignSourcingSlots)이
    // 서로 다른 후보를 골라야 하므로 후보 풀이 8개면 다양성이 부족했다.
    const promising = keywordStats
      .filter(k => k.totalMonthly >= 300)
      .sort((a, b) => {
        // Sort by blue-ocean potential: good volume + low competition
        const aScore = a.totalMonthly * (a.competition === 'low' ? 3 : a.competition === 'mid' ? 2 : 1);
        const bScore = b.totalMonthly * (b.competition === 'low' ? 3 : b.competition === 'mid' ? 2 : 1);
        return bScore - aScore;
      })
      .slice(0, 24);

    // SE05(#324): 네이버 쇼핑검색 API가 영구 종료돼 analyzeCompetition()은 항상
    // 실패한다 — 더 이상 호출하지 않는다. 블루오션 판정은 검색량 + 검색광고
    // competition(low/mid/high)만으로 산출하고, 가격대는 Step 6에서 실측
    // 도매가(matchWholesaleProducts)로 보완한다(docs/design/NAVER_SHOPPING_API_SUNSET_RESPONSE.md §3-A).
    const COMPETITION_LEVEL_LABEL: Record<string, string> = {
      low: 'LOW', mid: 'MEDIUM', high: 'HIGH', unknown: 'UNKNOWN',
    };

    const opportunities: SourcingOpportunity[] = [];
    // 경쟁분석 API 호출이 없어졌으므로 이 단계에서 실패할 여지가 없다 — 필드는
    // 결과 스키마 호환을 위해 유지하되 항상 0이다.
    const competitionAnalysisFailures = 0;

    for (const kw of promising) {
      const blueOceanScore = calcBlueOceanScore({
        monthlyVolume: kw.totalMonthly,
        competition: kw.competition,
        plAvgDepth: kw.plAvgDepth,
      });

      const reasons: string[] = [];
      if (kw.totalMonthly >= 1000 && kw.totalMonthly < 10000) {
        reasons.push('ideal_search_volume');
      }
      if (kw.competition === 'low') reasons.push('low_competition');
      else if (kw.competition === 'high') reasons.push('high_competition');

      // 렌즈 판정용 트렌드 d1(DataLab 10대분류 어휘) — z-score/lens 신호
      // 조회 전용, 아래 category(UCE)와는 별개로 유지한다.
      const trendD1 = trendCategories.find(cat =>
        kw.keyword.includes(cat) || cat.includes(kw.keyword)
      ) ?? trendCategories[0] ?? 'general';

      // UCE 연동(§3-4, 구현 B, 병합 필수): 표시·저장용 카테고리는 결정론적
      // 매처(전체 5,021개 leaf 대상)의 top 결과로 채운다 — 이전엔 trendD1을
      // 문자열 포함매칭으로 그대로 라벨에 썼기 때문에 "차량용방향제"가 무관한
      // 트렌드 대분류로 오분류되는 게 아침 알림 카테고리 오류의 근본원인이었다
      // (#351). 빈손(n=0)이면 trendD1로 폴백하되 정직표시(#310) — 저장된
      // 값이 UCE 확정이 아님을 라벨 자체로 드러낸다.
      const ucMatch = matchDeterministicCategories(kw.keyword)[0];
      const matchedCat = ucMatch ? ucMatch.d1 : `${trendD1}(카테고리 미확정)`;

      opportunities.push({
        keyword: kw.keyword,
        category: matchedCat,
        trendD1,
        monthlySearchVolume: kw.totalMonthly,
        competition: kw.competition,
        // 가격대·상품수는 쇼핑검색 없이는 알 수 없다 — 가짜값(0) 대신 null로
        // 두고 Step 6에서 top5에 한해 실측 도매가(supplyPriceRange)로 보완한다.
        avgPrice: null,
        minPrice: null,
        maxPrice: null,
        totalResults: null,
        competitionLevel: COMPETITION_LEVEL_LABEL[kw.competition] ?? 'UNKNOWN',
        suggestedSupplyPrice: 0,
        estimatedMargin: 0,
        blueOceanScore,
        reason: reasons.join(', ') || 'trend_match',
        topSellers: [],
        blueOceanBase: blueOceanScore,
      });
    }

    // Sort by blue ocean score descending
    opportunities.sort((a, b) => b.blueOceanScore - a.blueOceanScore);

    // Step 4.5 (P1-A): 취급 제외 정책 적용 — 식품/화장품/브랜드로 판정된 후보는
    // 소싱 추천에서 제외한다. 소싱·수집·발행이 공유하는 judgeExclusion() 하나만 쓴다.
    const excludedSamples: { keyword: string; reason: string }[] = [];
    const filteredOpportunities = opportunities.filter((opp) => {
      const verdict = judgeExclusion({ categoryD1: opp.category, productName: opp.keyword });
      if (verdict.excluded) {
        excludedSamples.push({ keyword: opp.keyword, reason: verdict.reason ?? '' });
        return false;
      }
      return true;
    });
    opportunities.length = 0;
    opportunities.push(...filteredOpportunities);

    // Step 4.6 (P0-4 → 렌즈 통일 2026-08-27): sourcing-lenses.ts
    // LENS_DAILY_QUOTA(급상승2·시즌2·니치2·블루오션2·꿀통1·스테디1=10)로
    // 유형별 배분한다. 기준 미충족 슬롯은 정직하게 미달 표시(억지로 채우지
    // 않음). 이후 단계(AI 인사이트, 도매매칭)는 opportunities 전체가 아니라
    // 이 선택 결과에만 적용한다.
    const slots = await assignSourcingSlots(opportunities);
    const selectedKeywords = new Set<string>();
    const selectedFromSlots: SourcingOpportunity[] = [];
    for (const slot of slots) {
      for (const o of slot.opportunities) {
        if (selectedKeywords.has(o.keyword)) continue; // golden 오버레이 등 중복 제거
        selectedKeywords.add(o.keyword);
        selectedFromSlots.push(o);
      }
    }
    // 슬롯이 일부 비어(quota 미달) selectedFromSlots가 목표치(§3-0: 일일 10건)
    // 미만이면, 기존 소비처(위젯·weekly-report)가 기대하는 "다다익선" 형태를
    // 유지하기 위해 blueOceanScore 상위 나머지로 채운다.
    const DAILY_TARGET_TOTAL = Object.values(LENS_DAILY_QUOTA).reduce((a, b) => a + b, 0);
    const selectedOpportunities = [...selectedFromSlots];
    for (const opp of opportunities) {
      if (selectedOpportunities.length >= DAILY_TARGET_TOTAL) break;
      if (selectedKeywords.has(opp.keyword)) continue;
      selectedOpportunities.push(opp);
      selectedKeywords.add(opp.keyword);
    }

    // Step 5: Generate AI insights for top opportunities
    const aiResult = await generateAiInsight(selectedOpportunities, trendCategories);

    // Apply AI insights to each opportunity
    for (const opp of selectedOpportunities) {
      const tip = aiResult.perItem.get(opp.keyword);
      if (tip) opp.aiInsight = tip;
    }

    // Step 6 (E-8): Search wholesale platforms for actual products
    // Match selected (slot-assigned) keywords against Domeggook (min qty=1) + Domemae
    let wholesaleMatchFailures = 0;
    for (const opp of selectedOpportunities) {
      try {
        const wholesaleResult = await matchWholesaleProducts(opp.keyword);
        // P1-A: 개별 도매 상품명도 브랜드 휴리스틱으로 한 번 더 거른다(키워드 통과 ≠ 실상품 통과).
        const cleanMatches = wholesaleResult.matches.filter(
          (w) => !judgeExclusion({ productName: w.name }).excluded
        );

        // SOURCING_NEGATIVE_MARGIN_ROOT_CAUSE(2026-08-04): 도매매칭은 키워드
        // 전문검색이라 이종 상품이 섞인다(예: "텐트" 검색에 캠핑 소품이 걸림).
        // 최저가 1건으로 "대표 판매가"를 역산해 전체 마진을 계산하던 과거
        // 로직은 이종상품 오염으로 마이너스 수백%가 나올 수 있어 폐기했다.
        // avgPrice/estimatedMargin은 채우지 않는다(0 유지, 가짜값 금지) — 대신
        // 실측 공급가 "범위"만 사실대로 노출해 대표님이 직접 판매가를 책정한다.
        opp.wholesaleMatches = cleanMatches;
        opp.wholesalePlatforms = wholesaleResult.searchedPlatforms;
        if (cleanMatches.length > 0) {
          const prices = cleanMatches.map((w) => w.supplyPrice);
          opp.suggestedSupplyPrice = Math.min(...prices);
          opp.supplyPriceRange = { min: Math.min(...prices), max: Math.max(...prices) };
        }
      } catch {
        // Non-fatal(#270): opportunity still valid without wholesale matches —
        // but count it instead of swallowing silently.
        wholesaleMatchFailures++;
      }
      // Rate limit between wholesale searches
      await new Promise(r => setTimeout(r, 500));
    }

    return {
      date: today,
      trendSource: trends.source,
      trendCategories,
      opportunities: selectedOpportunities, // 슬롯 배정 결과 (최대 10건, §3-0) — 하위호환 형태 유지
      slots,
      seedSource,
      aiSummary: aiResult.summary || undefined,
      excludedCount: excludedSamples.length,
      excludedSamples: excludedSamples.slice(0, 10),
      keywordStatFailures,
      competitionAnalysisFailures,
      wholesaleMatchFailures,
    };
  } catch (err) {
    return {
      date: today,
      trendSource: 'error',
      trendCategories: [],
      opportunities: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ── Scan + persist + notify (근본수정 2026-08-11, #338) ──────────────────────
// 기존엔 이 로직(중복발송 가드+DB저장+Discord발송)이 /api/sourcing-recommend
// POST 핸들러에만 있었고, cron/sourcing-daily는 그 라우트를 HTTP self-fetch로
// 호출했다. self-fetch 대상 라우트에 maxDuration 지정이 빠져 Vercel Hobby
// 기본 10초 제한에 걸렸다(실측: dryRun만으로도 8.4초) — 아침 알림 미발송의
// 근본원인. 여기로 로직을 옮겨 cron이 같은 프로세스 안에서 직접 호출하게
// 하면 cron 라우트 자체의 maxDuration=60이 전체를 커버한다(별도 함수 홉 제거).
// POST 라우트(대시보드 버튼용)는 이 함수를 그대로 호출하도록 재배선한다.

const SOURCING_RETENTION_DAYS = 7; // GET/POST route.ts와 동일 — 7일치만 보관.

export interface SourcingScanOutcome {
  skipped: boolean;
  reason?: string;
  dryRun: boolean;
  discordSent: boolean;
  embedPreview?: Record<string, unknown>;
  scan: SourcingRecommendResult;
  // skipped(already-sent-today) 경로는 새로 스캔하지 않으므로 scan.opportunities가
  // 비어있다 — 호출자가 "오늘 이미 몇 건 저장돼 있었는지"를 알 수 있게 별도 노출.
  skippedExistingCount?: number;
}

export async function runSourcingScan(opts: {
  dryRun: boolean;
  sendToDiscord: boolean;
}): Promise<SourcingScanOutcome> {
  const { dryRun, sendToDiscord } = opts;

  // 중복 발송 방지(#337): 같은 날 이미 스캔+저장된 레코드가 있으면 재실행을
  // 건너뛴다. dryRun/discord:false 미리보기 호출은 발송이 없으므로 예외.
  if (!dryRun && sendToDiscord) {
    const todayGuard = new Date();
    todayGuard.setHours(0, 0, 0, 0);
    const alreadyToday = await prisma.sourcingOpportunityRecord
      .count({ where: { date: todayGuard } })
      .catch(() => 0);
    if (alreadyToday > 0) {
      return {
        skipped: true,
        reason: 'already-sent-today',
        dryRun,
        discordSent: false,
        skippedExistingCount: alreadyToday,
        scan: {
          date: todayGuard.toLocaleDateString('ko-KR'),
          trendSource: 'skipped',
          trendCategories: [],
          opportunities: [],
        },
      };
    }
  }

  const result = await generateSourcingRecommendations();

  if (dryRun) {
    if (result.opportunities.length > 0) {
      const nowMonth = new Date().getMonth() + 1;
      const tags = await resolveRecoTypeTags(
        result.opportunities.map((o) => ({
          // reco-type-resolver도 category-trend-cache(DataLab 10대분류 어휘)를
          // 쓰므로 UCE 라벨(category)이 아니라 trendD1을 넘긴다.
          d1: o.trendD1 === 'general' ? '' : o.trendD1,
          supplierPrice: o.suggestedSupplyPrice,
        })),
        nowMonth,
      ).catch(() => result.opportunities.map(() => null));
      result.opportunities.forEach((o, i) => { o.recoType = tags[i] ?? null; });
    }
    const embed = buildSourcingRecommendEmbed(result);
    return { skipped: false, dryRun: true, discordSent: false, embedPreview: embed, scan: result };
  }

  // #250 §3: 저장 전에 recoType 태그를 붙여야 한다(먼저 저장하면 reco_type이
  // 항상 null로 저장되는 순서 버그가 된다).
  if (result.opportunities.length > 0) {
    const nowMonth = new Date().getMonth() + 1;
    const tags = await resolveRecoTypeTags(
      result.opportunities.map((o) => ({
        d1: o.trendD1 === 'general' ? '' : o.trendD1,
        supplierPrice: o.suggestedSupplyPrice,
      })),
      nowMonth,
    ).catch(() => result.opportunities.map(() => null));
    result.opportunities.forEach((o, i) => { o.recoType = tags[i] ?? null; });
  }

  if (result.opportunities.length > 0) {
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);

    // 누적 정리(#331 후속) — best-effort(#82), 정리 실패해도 저장은 진행.
    const retentionCutoff = new Date(todayDate);
    retentionCutoff.setDate(retentionCutoff.getDate() - SOURCING_RETENTION_DAYS);
    await prisma.daily_recommendations.deleteMany({
      where: { date: { lt: retentionCutoff }, season_tag: 'sourcing' },
    }).catch(() => null);
    await prisma.sourcingOpportunityRecord.deleteMany({
      where: { date: { lt: retentionCutoff } },
    }).catch(() => null);

    await prisma.daily_recommendations.deleteMany({
      where: { date: todayDate, season_tag: 'sourcing' },
    });

    await prisma.daily_recommendations.createMany({
      data: result.opportunities.map(opp => ({
        date: todayDate,
        product_name: opp.keyword,
        honey_score: opp.blueOceanScore,
        season_tag: 'sourcing',
        status: 'sent',
      })),
    });

    await prisma.sourcingOpportunityRecord.deleteMany({
      where: { date: todayDate },
    }).catch(() => null);

    await prisma.sourcingOpportunityRecord.createMany({
      data: result.opportunities.map((opp, i) => ({
        date: todayDate,
        keyword: opp.keyword,
        category: opp.category || null,
        monthlySearchVolume: opp.monthlySearchVolume,
        competition: opp.competition,
        blueOceanScore: opp.blueOceanScore,
        rank: i,
        supplyPriceRange: (opp.supplyPriceRange ?? null) as unknown as Prisma.InputJsonValue,
        wholesaleMatches: (opp.wholesaleMatches ?? null) as unknown as Prisma.InputJsonValue,
        aiInsight: opp.aiInsight ?? null,
        recoType: opp.recoType?.type ?? null,
      })),
    }).catch(() => null);
  }

  let discordSent = false;
  if (sendToDiscord && result.opportunities.length > 0) {
    const embed = buildSourcingRecommendEmbed(result);
    const discordResult = await sendDiscord('KKOTTI_RECOMMEND', '', [embed]);
    discordSent = discordResult.ok;
  }

  return { skipped: false, dryRun: false, discordSent, scan: result };
}

// ── Discord Embed Builder ────────────────────────────────────────────────────

// P1-D: 소싱 추천은 친밀 표면(정보 제공·격려) → 꼬띠 톤 유지(#318).
const KKOTTI_SOURCING_INTRO = [
  '까꿍💖 오늘 꿀통 후보들 새로 찾아왔어유!',
  '까꿍💖 트렌드 데이터 뒤져서 후보 골라봤어유~',
  '까꿍💖 오늘도 블루오션 찾으러 다녀왔어유!',
];
const KKOTTI_SOURCING_FOUND = [
  '이 중에 마음에 드는 거 있으면 도매처부터 확인해봐유!',
  '경쟁 낮은 것부터 먼저 검토해보시는 걸 추천드려유~',
  '오늘 후보들, 놓치지 말고 한 번씩 살펴봐주어유!',
];
const KKOTTI_SOURCING_EMPTY = [
  '오늘은 조건에 맞는 후보가 없어요. 내일 다시 찾아볼게요.',
  '오늘은 마땅한 게 없네유. 내일 더 열심히 찾아볼게유!',
];

export function buildSourcingRecommendEmbed(result: SourcingRecommendResult): Record<string, unknown> {
  const RANK_ICONS = [':first_place:', ':second_place:', ':third_place:', ':four:', ':five:'];
  const COMP_LABEL: Record<string, string> = {
    low: ':green_circle: 낮음',
    mid: ':yellow_circle: 보통',
    high: ':red_circle: 높음',
    unknown: ':white_circle: 미확인',
  };

  // 모바일 레이아웃 재설계 옵션1(2026-08-04, docs/design/
  // SOURCING_DISCORD_MOBILE_LAYOUT_2026-08-04.md §3-2): 필드 압축.
  // Discord embed는 클라이언트 렌더(desktop/mobile)에 따라 폭이 크게 달라지고
  // (Discord 공식 가이드: "Embeds are rendered client-side... plan out and
  // test how your embeds look on desktop and mobile"), inline 필드도 화면폭에
  // 따라 자동 세로 재배치되어 예측이 어렵다 — 그래서 열(inline) 분할이 아니라
  // "필드 하나당 줄 수를 줄이는" 방향으로 압축한다.
  //
  // AI 코멘트는 더 이상 상품별 필드에 넣지 않고 description(상단 요약)에서
  // 한 번만 노출한다 — 이전엔 5개 필드마다 코멘트가 반복돼 모바일에서 필드
  // 하나가 5~6줄까지 길어졌다(운영자 스크린샷 실측). 상품별 필드는 "무엇을
  // 살지 판단하는 데 필요한 핵심 3줄"(제목/경쟁+검색량/가격+도매처)만 남긴다.
  const fields: Record<string, unknown>[] = result.opportunities.map((opp, i) => {
    const typeTag = opp.recoType ? `${opp.recoType.emoji} ${opp.recoType.label} ` : '';
    const supplyLine = opp.supplyPriceRange
      ? (opp.supplyPriceRange.min === opp.supplyPriceRange.max
          ? `공급가 **${opp.supplyPriceRange.min.toLocaleString()}원**`
          : `공급가 **${opp.supplyPriceRange.min.toLocaleString()}~${opp.supplyPriceRange.max.toLocaleString()}원**`)
      : '공급가 미확인';

    // 도매처는 1건만 인라인 표시(기존 2건 → 1건, 모바일 줄 수 절감). 단
    // 최저가가 이종상품 의심(outlier)이거나 부속품/소모품 의심(accessoryRisk)
    // 이면 무의미한 정보라 그 다음 "본품+정상가"를 대신 보여준다(정상품 정보
    // 손실 방지) — 전부 걸리면 최저가로 폴백. 2026-08-05 accessoryRisk 추가.
    const clean = opp.wholesaleMatches?.find((w) => !w.priceOutlier && !w.accessoryRisk);
    const normal = clean ?? opp.wholesaleMatches?.find((w) => !w.priceOutlier);
    const top = normal ?? opp.wholesaleMatches?.[0];
    // 경고는 필드 압축(#326-B)과 "이유를 알아야 한다"는 운영자 요구가 상충하므로
    // 짧게라도 이유를 남긴다. 가격이탈(다른상품)과 부속품 의심을 구분해 표기.
    const outlierNote = top?.priceOutlier
      ? ' :warning:다른상품일수있음'
      : top?.accessoryRisk
        ? ' :warning:부속품일수있음'
        : '';
    const wholesaleLine = top
      ? `[${top.platform}] 공급가 **${top.supplyPrice.toLocaleString()}원**${outlierNote} | [보러가기](${top.url})`
      : `${supplyLine} — 도매처 미확인`;

    return {
      name: `${RANK_ICONS[i] ?? `${i + 1}.`} ${typeTag}${opp.keyword} (${opp.blueOceanScore}점)`,
      value: [
        `${COMP_LABEL[opp.competition] ?? ''} 경쟁 | 월 ${opp.monthlySearchVolume.toLocaleString()}건 검색`,
        wholesaleLine,
      ].join('\n'),
      inline: false,
    };
  });

  // 렌즈 요약 필드(#295 단일 권위 통일, 2026-08-27) — result.opportunities[].
  // lensMatches를 집계한다. 판정 로직은 여기서 새로 만들지 않고 sourcing-
  // lenses.ts classifySourcingLenses()가 이미 붙여둔 결과만 센다.
  const lensCounts = new Map<SourcingLens, number>();
  for (const o of result.opportunities) {
    for (const m of o.lensMatches ?? []) {
      lensCounts.set(m.lens, (lensCounts.get(m.lens) ?? 0) + 1);
    }
  }
  const LENS_SUMMARY_ORDER: SourcingLens[] = ['rising', 'seasonal', 'niche', 'blueOcean', 'honeypot', 'golden', 'steady'];
  const lensSummaryLine = LENS_SUMMARY_ORDER
    .filter((l) => (lensCounts.get(l) ?? 0) > 0)
    .map((l) => `${LENS_META[l].emoji} ${LENS_META[l].label} ${lensCounts.get(l)}`)
    .join(' · ');
  const redOceanCount = result.opportunities.filter((o) => o.redOceanWarning).length;
  if (lensSummaryLine) {
    fields.unshift({
      name: ':mag: 오늘의 렌즈 요약',
      value: lensSummaryLine + (redOceanCount > 0 ? `\n:warning: 레드오션 주의 ${redOceanCount}건 — 진입은 신중하게` : ''),
      inline: false,
    });
  }

  // Trend info field
  if (result.trendCategories.length > 0) {
    fields.unshift({
      name: ':chart_with_upwards_trend: 요즘 뜨는 카테고리',
      value: result.trendCategories.join(' / ') + ` (${result.trendSource})`,
      inline: false,
    });
  }

  if (result.excludedCount && result.excludedCount > 0) {
    fields.push({
      name: ':no_entry_sign: 취급 제외로 걸러낸 후보',
      value: `${result.excludedCount}건 제외 — ${(result.excludedSamples ?? []).map((s) => `${s.keyword}(${s.reason})`).join(', ') || '-'}`,
      inline: false,
    });
  }

  // P1-E(#270): 무음 실패 금지 — 실패가 있었다면 "0건"과 "전부 실패"를 구분해 표시한다.
  const totalFailures =
    (result.keywordStatFailures ?? 0) + (result.competitionAnalysisFailures ?? 0) + (result.wholesaleMatchFailures ?? 0);
  if (totalFailures > 0) {
    const failParts: string[] = [];
    if (result.keywordStatFailures) failParts.push(`검색량 조회 실패 ${result.keywordStatFailures}건`);
    if (result.competitionAnalysisFailures) failParts.push(`경쟁 분석 실패 ${result.competitionAnalysisFailures}건`);
    if (result.wholesaleMatchFailures) failParts.push(`도매처 매칭 실패 ${result.wholesaleMatchFailures}건`);
    fields.push({
      name: ':warning: 조회 실패',
      value: failParts.join(' / '),
      inline: false,
    });
  }

  const typeSummary = recoTypeSummary(result.opportunities.map((o) => o.recoType));
  const kkottiTail = result.opportunities.length > 0
    ? pickVariant(KKOTTI_SOURCING_FOUND, 'sourcing:found')
    : pickVariant(KKOTTI_SOURCING_EMPTY, 'sourcing:empty');
  const kkotti = `${pickVariant(KKOTTI_SOURCING_INTRO, 'sourcing:intro')} ${kkottiTail}${seasonalGreeting('sourcing', new Date(), false)}`;

  // 정원 컨셉 4섹션 구조(2026-08-05, 운영자 스크린샷 피드백: "오늘의 추천"
  // 알림의 🌱현황/⛲️영향/🍯미션/🌷한마디 이모지·구조가 마음에 든다 →
  // 소싱봇에도 이식). description 상단은 AI 요약 + 유형 요약만 간결히 두고,
  // 나머지는 섹션 필드로 구조화해 모바일 스캔성을 높인다.
  const description = [
    result.aiSummary ?? '오늘 뜨는 카테고리를 뒤져서 소싱하기 좋은 상품을 골라왔어유.',
    typeSummary ? `\n**이번 주 유형** — ${typeSummary}` : '',
    '',
    result.opportunities.length > 0
      ? `:seedling: **블루오션 ${result.opportunities.length}건**을 찾았어요. 아래에서 도매처를 바로 확인할 수 있어요!`
      : '오늘은 조건에 맞는 후보가 없어요. 내일 다시 찾아볼게요.',
  ].filter(Boolean).join('\n');

  // ⛲️ 영향 + 🍯 미션 + 🌷 한마디 섹션(발송 embed 하단에 순서대로 붙는다).
  // 소싱은 "오늘 발굴 → 오늘 등록"이 핵심이므로 등록 타이밍 가치를 짚어준다.
  if (result.opportunities.length > 0) {
    fields.push({
      name: ':fountain: 왜 지금인가요',
      value: '오늘 등록하면 7일 신상품 가산점 기간이 바로 시작돼요. 경쟁 낮은 것부터 먼저 검토해보세요.',
      inline: false,
    });
    fields.push({
      name: ':honey_pot: 꼬띠의 미션',
      value: [
        '1. 마음에 드는 키워드의 [보러가기]로 도매처 확인',
        '2. 씨앗 심기에서 상품 등록 시작',
        '3. 검색 조련사에서 경쟁 강도 한 번 더 확인',
      ].join('\n'),
      inline: false,
    });
  }
  fields.push({
    name: ':tulip: 꼬띠 한마디',
    value: kkotti,
    inline: false,
  });

  return {
    title: `:tulip: 꼬띠의 오늘 소싱 추천 — ${result.date}`,
    description,
    color: 0xff6b8a, // KKOTIUM pink
    fields,
    footer: { text: '꽃틔움 가든 · 꼬띠 소싱봇' },
    timestamp: new Date().toISOString(),
  };
}
