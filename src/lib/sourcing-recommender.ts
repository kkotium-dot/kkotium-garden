// src/lib/sourcing-recommender.ts
// E-7: Kkotti Sourcing Recommender Bot
// Analyzes Naver trends + keyword stats + competition data
// to recommend blue-ocean product opportunities for sourcing
// Runs daily via cron and pushable to Discord #kkotti-daily

import { fetchNaverTrends, type TrendResult } from '@/lib/trend-analyzer';
import { searchShopping, analyzeCompetition, type CompetitionAnalysis } from '@/lib/naver/shopping-search';
import { fetchKeywordStats, type KeywordStat } from '@/lib/naver/keyword-api';
import { matchWholesaleProducts, type WholesaleProduct } from '@/lib/wholesale-matcher';
import { entryBarrierToBlueOceanBonus, type EntryBarrierAnalysis } from '@/lib/competition-monitor';
import { recoTypeSummary, type RecoTypeTag } from '@/lib/naver/recommendation-type';
import { judgeExclusion } from '@/lib/policy/exclusion-rules';
import { pickVariant, seasonalGreeting } from '@/lib/notifications/kkotti-variation';

// ── Types ────────────────────────────────────────────────────────────────────

export interface SourcingOpportunity {
  keyword: string;
  category: string;
  monthlySearchVolume: number;
  competition: 'low' | 'mid' | 'high' | 'unknown';
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  totalResults: number;
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
  // E-10: Entry barrier analysis (Option A - indirect estimation)
  entryBarrierLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
  entryBarrierScore?: number;       // 0~5 (5 = highest barrier)
  entryBarrierBonus?: number;       // -10, 0, or +15 applied to BlueOcean
  // #250 §3: 꼬띠 추천 유형 태그 (황금🏆/니치💎/시즌🗓️) — resolved by the route.
  recoType?: RecoTypeTag | null;
  blueOceanBase?: number;           // Score before entry barrier bonus
  uniqueSellersInTop?: number;      // unique mallNames in top results
  priceSpread?: number;             // (max-min)/avg, rounded to 2 decimals
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
function calcBlueOceanScore(params: {
  monthlyVolume: number;
  competition: string;
  totalResults: number;
  avgPrice: number;
}): number {
  let score = 50; // base

  // Search volume sweet spot: 1,000~10,000/month = ideal
  const vol = params.monthlyVolume;
  if (vol >= 1000 && vol < 5000) score += 25;       // sweet spot
  else if (vol >= 5000 && vol < 10000) score += 20;  // good
  else if (vol >= 500 && vol < 1000) score += 15;    // niche
  else if (vol >= 10000 && vol < 30000) score += 10;  // crowded but volume
  else if (vol >= 30000) score += 5;                   // very crowded
  else if (vol < 500 && vol > 0) score += 10;          // very niche
  else score -= 10;                                     // no data

  // Competition: low = great, high = bad
  if (params.competition === 'low') score += 20;
  else if (params.competition === 'mid') score += 10;
  else if (params.competition === 'high') score -= 5;

  // Total search results: fewer = less competition
  if (params.totalResults < 1000) score += 15;
  else if (params.totalResults < 5000) score += 10;
  else if (params.totalResults < 30000) score += 5;
  else if (params.totalResults > 100000) score -= 10;

  // Price range: 10,000~50,000 = optimal for home goods margin
  if (params.avgPrice >= 10000 && params.avgPrice <= 50000) score += 10;
  else if (params.avgPrice >= 5000 && params.avgPrice < 10000) score += 5;
  else if (params.avgPrice > 50000 && params.avgPrice <= 100000) score += 3;

  return Math.max(0, Math.min(100, score));
}

// E-10: Estimate entry barrier directly from competition analysis (no full snapshot needed).
// Reuses the same indirect signals as calcEntryBarrier() in competition-monitor.ts but
// works against analyzeCompetition() output (which gives topSellers, not topItems).
function calcEntryBarrierFromComp(params: {
  topSellers: string[];
  minPrice: number;
  maxPrice: number;
  avgPrice: number;
  totalResults: number;
  competitionLevel: string;
}): { score: number; level: 'LOW' | 'MEDIUM' | 'HIGH'; uniqueSellers: number; priceSpread: number } {
  let score = 2.5;

  const uniqueSellers = new Set(params.topSellers.filter(Boolean)).size;
  if (uniqueSellers >= 5) score += 0.5;
  else if (uniqueSellers > 0 && uniqueSellers <= 2) score -= 0.5;

  const spread = params.avgPrice > 0
    ? (params.maxPrice - params.minPrice) / params.avgPrice
    : 0;
  if (spread >= 0.5) score -= 0.5;
  else if (spread > 0 && spread < 0.2) score += 0.5;

  if (params.totalResults >= 100000) score += 1.5;
  else if (params.totalResults >= 30000) score += 1.0;
  else if (params.totalResults >= 5000) score += 0.5;
  else if (params.totalResults < 1000) score -= 0.5;

  // analyzeCompetition's competitionLevel is a string label; normalize via known buckets
  const lvl = (params.competitionLevel ?? '').toUpperCase();
  if (lvl.includes('VERY') || lvl.includes('ㅈ')) score += 0.5;
  else if (lvl.includes('LOW') || lvl.includes('ㄴ')) score -= 0.5;

  score = Math.max(0, Math.min(5, score));

  const level: 'LOW' | 'MEDIUM' | 'HIGH' =
    score >= 3.5 ? 'HIGH' :
    score >= 2.0 ? 'MEDIUM' : 'LOW';

  return {
    score: Math.round(score * 10) / 10,
    level,
    uniqueSellers,
    priceSpread: Math.round(spread * 100) / 100,
  };
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
    `${i + 1}. "${o.keyword}" - monthly ${o.monthlySearchVolume}, competition ${o.competition}, avgPrice ${o.avgPrice}KRW, blueOcean ${o.blueOceanScore}/100`
  ).join('\n');

  const prompt = `You are a Korean Naver Smart Store sourcing expert. Analyze these blue-ocean product opportunities and give actionable sourcing advice.

Trending categories today: ${trendCategories.join(', ')}

Top opportunities:
${itemList}

Respond ONLY in Korean JSON (no markdown, no backticks):
{
  "summary": "2-3 sentence overall sourcing strategy for today",
  "items": [
    {"keyword": "keyword1", "tip": "1 sentence specific sourcing tip"},
    {"keyword": "keyword2", "tip": "1 sentence specific sourcing tip"}
  ]
}`;

  try {
    // Round-robin Groq keys
    const keys = [groqKey, process.env.GROQ_API_KEY_2].filter(Boolean);
    const key = keys[Math.floor(Math.random() * keys.length)] ?? groqKey;

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 600,
        temperature: 0.4,
      }),
    });

    if (!res.ok) return fallback;

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content ?? '';
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
    // Step 1: Get trending categories from DataLab
    const trends: TrendResult = await fetchNaverTrends();
    const trendCategories = trends.trendCategories.length > 0
      ? trends.trendCategories
      : ['가구/인테리어']; // default for KKOTIUM

    // Step 2: Expand categories to search keywords
    const candidateKeywords: string[] = [];
    for (const cat of trendCategories) {
      const expanded = expandCategoryToKeywords(cat);
      candidateKeywords.push(...expanded);
    }

    // Also add trend keywords directly
    candidateKeywords.push(...trends.trendKeywords.slice(0, 5));

    // Deduplicate
    const uniqueKeywords = [...new Set(candidateKeywords)].slice(0, 15);

    if (uniqueKeywords.length === 0) {
      return {
        date: today,
        trendSource: trends.source,
        trendCategories,
        opportunities: [],
        error: 'No candidate keywords found from trend data',
      };
    }

    // Step 3: Fetch keyword search volumes (batch 5 at a time)
    const keywordStats: KeywordStat[] = [];
    let keywordStatFailures = 0;
    for (let i = 0; i < uniqueKeywords.length; i += 5) {
      const batch = uniqueKeywords.slice(i, i + 5);
      try {
        const stats = await fetchKeywordStats(batch);
        keywordStats.push(...stats);
      } catch {
        // P1-E(#270): 무음 실패 금지 — 배치 실패는 건너뛰되 카운트는 남긴다.
        keywordStatFailures += batch.length;
      }
      // Rate limit: 300ms between batches
      if (i + 5 < uniqueKeywords.length) {
        await new Promise(r => setTimeout(r, 300));
      }
    }

    // Step 4: Analyze competition for promising keywords
    // Filter: monthly volume >= 300, prefer low/mid competition
    const promising = keywordStats
      .filter(k => k.totalMonthly >= 300)
      .sort((a, b) => {
        // Sort by blue-ocean potential: good volume + low competition
        const aScore = a.totalMonthly * (a.competition === 'low' ? 3 : a.competition === 'mid' ? 2 : 1);
        const bScore = b.totalMonthly * (b.competition === 'low' ? 3 : b.competition === 'mid' ? 2 : 1);
        return bScore - aScore;
      })
      .slice(0, 8);

    const opportunities: SourcingOpportunity[] = [];
    let competitionAnalysisFailures = 0;

    for (const kw of promising) {
      try {
        const comp = await analyzeCompetition(kw.keyword);

        // Estimate supply price as ~35% of avg price (typical wholesale margin)
        const suggestedSupplyPrice = Math.round(comp.avgPrice * 0.35);
        const estimatedMargin = comp.avgPrice > 0
          ? Math.round(((comp.avgPrice - suggestedSupplyPrice - comp.avgPrice * 0.058) / comp.avgPrice) * 100)
          : 0;

        const baseScore = calcBlueOceanScore({
          monthlyVolume: kw.totalMonthly,
          competition: kw.competition,
          totalResults: comp.totalResults,
          avgPrice: comp.avgPrice,
        });

        // E-10: Apply entry barrier bonus to BlueOcean score
        const barrier = calcEntryBarrierFromComp({
          topSellers: comp.topSellers,
          minPrice: comp.minPrice,
          maxPrice: comp.maxPrice,
          avgPrice: comp.avgPrice,
          totalResults: comp.totalResults,
          competitionLevel: comp.competitionLevel,
        });
        const entryBarrierBonus = entryBarrierToBlueOceanBonus(barrier.level);
        const blueOceanScore = Math.max(0, Math.min(100, baseScore + entryBarrierBonus));

        // Build reason string
        const reasons: string[] = [];
        if (kw.totalMonthly >= 1000 && kw.totalMonthly < 10000) {
          reasons.push('ideal_search_volume');
        }
        if (kw.competition === 'low') reasons.push('low_competition');
        if (comp.totalResults < 5000) reasons.push('few_competitors');
        if (comp.avgPrice >= 10000 && comp.avgPrice <= 50000) reasons.push('good_price_range');
        // E-10: Reflect entry barrier in reason
        if (barrier.level === 'LOW') reasons.push('low_entry_barrier');
        else if (barrier.level === 'HIGH') reasons.push('high_entry_barrier');

        // Find matching trend category
        const matchedCat = trendCategories.find(cat =>
          kw.keyword.includes(cat) || cat.includes(kw.keyword)
        ) ?? trendCategories[0] ?? 'general';

        opportunities.push({
          keyword: kw.keyword,
          category: matchedCat,
          monthlySearchVolume: kw.totalMonthly,
          competition: kw.competition,
          avgPrice: comp.avgPrice,
          minPrice: comp.minPrice,
          maxPrice: comp.maxPrice,
          totalResults: comp.totalResults,
          competitionLevel: comp.competitionLevel,
          suggestedSupplyPrice,
          estimatedMargin,
          blueOceanScore,
          reason: reasons.join(', ') || 'trend_match',
          topSellers: comp.topSellers.slice(0, 3),
          // E-10: Entry barrier breakdown for UI display
          entryBarrierLevel: barrier.level,
          entryBarrierScore: barrier.score,
          entryBarrierBonus,
          blueOceanBase: baseScore,
          uniqueSellersInTop: barrier.uniqueSellers,
          priceSpread: barrier.priceSpread,
        });

        // Rate limit between competition checks
        await new Promise(r => setTimeout(r, 300));
      } catch {
        // P1-E(#270): 무음 실패 금지 — 이 키워드는 건너뛰되 카운트는 남긴다.
        competitionAnalysisFailures++;
      }
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

    // Step 5: Generate AI insights for top opportunities
    const aiResult = await generateAiInsight(opportunities, trendCategories);

    // Apply AI insights to each opportunity
    for (const opp of opportunities) {
      const tip = aiResult.perItem.get(opp.keyword);
      if (tip) opp.aiInsight = tip;
    }

    // Step 6 (E-8): Search wholesale platforms for actual products
    // Match top 5 keywords against Domeggook (min qty=1 filter) + Domemae
    const top5Opps = opportunities.slice(0, 5);
    let wholesaleMatchFailures = 0;
    for (const opp of top5Opps) {
      try {
        const wholesaleResult = await matchWholesaleProducts(opp.keyword, opp.avgPrice);
        // P1-A: 개별 도매 상품명도 브랜드 휴리스틱으로 한 번 더 거른다(키워드 통과 ≠ 실상품 통과).
        opp.wholesaleMatches = wholesaleResult.matches.filter(
          (w) => !judgeExclusion({ productName: w.name }).excluded
        );
        opp.wholesalePlatforms = wholesaleResult.searchedPlatforms;
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
      opportunities: opportunities.slice(0, 5), // top 5 only
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

  const fields: Record<string, unknown>[] = result.opportunities.map((opp, i) => {
    const marginColor = opp.estimatedMargin >= 30 ? ':green_heart:' : opp.estimatedMargin >= 20 ? ':yellow_heart:' : ':broken_heart:';
    const typeTag = opp.recoType ? `${opp.recoType.emoji} ${opp.recoType.label} ` : '';
    return {
      name: `${RANK_ICONS[i] ?? `${i + 1}.`} ${typeTag}${opp.keyword} (${opp.blueOceanScore}점)`,
      value: [
        `${COMP_LABEL[opp.competition] ?? ''} 경쟁 | 월 ${opp.monthlySearchVolume.toLocaleString()}건 검색 | 검색결과 ${opp.totalResults.toLocaleString()}건`,
        `평균가 **${opp.avgPrice.toLocaleString()}원** (${opp.minPrice.toLocaleString()}~${opp.maxPrice.toLocaleString()}원)`,
        `${marginColor} 예상 순마진 **${opp.estimatedMargin}%** | 예상 공급가 ~${opp.suggestedSupplyPrice.toLocaleString()}원`,
        opp.topSellers.length > 0 ? `상위 판매자: ${opp.topSellers.join(' / ')}` : null,
        opp.aiInsight ? `> ${opp.aiInsight}` : null,
        // E-8: Wholesale matches inline
        opp.wholesaleMatches && opp.wholesaleMatches.length > 0
          ? `**도매처 (${opp.wholesalePlatforms?.join('+') ?? ''}):**\n` + opp.wholesaleMatches.slice(0, 2).map(w => {
              const mIcon = w.estimatedMargin >= 30 ? ':green_heart:' : ':yellow_heart:';
              return `  [${w.platform}] ${w.supplyPrice.toLocaleString()}원 ${mIcon}${w.estimatedMargin}% | [보러가기](${w.url})`;
            }).join('\n')
          : null,
      ].filter(Boolean).join('\n'),
      inline: false,
    };
  });

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

  const description = [
    result.aiSummary ?? '트렌드 데이터 + 키워드 분석을 마쳤어요.',
    typeSummary ? `\n**이번 주 유형** — ${typeSummary}` : '',
    '',
    result.opportunities.length > 0
      ? `**블루오션 ${result.opportunities.length}건**을 찾았어요. 도매처 확인을 추천드려요!`
      : '오늘은 조건에 맞는 후보가 없어요. 내일 다시 찾아볼게요.',
    '',
    kkotti,
  ].filter(Boolean).join('\n');

  return {
    title: `:tulip: 꼬띠의 오늘 소싱 추천 — ${result.date}`,
    description,
    color: 0xff6b8a, // KKOTIUM pink
    fields,
    footer: { text: '꽃틔움 가든 · 꼬띠 소싱봇' },
    timestamp: new Date().toISOString(),
  };
}
