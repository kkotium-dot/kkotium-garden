// src/lib/sourcing-recommender.ts
// E-7: Kkotti Sourcing Recommender Bot
// Analyzes Naver trends + keyword stats + competition data
// to recommend blue-ocean product opportunities for sourcing
// Runs daily via cron and pushable to Discord #kkotti-daily

import { fetchNaverTrends, type TrendResult } from '@/lib/trend-analyzer';
import { fetchKeywordStats, type KeywordStat } from '@/lib/naver/keyword-api';
import { matchWholesaleProducts, type WholesaleProduct } from '@/lib/wholesale-matcher';
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

  // Competition: low = great, high = bad (검색광고 keywordstool, 살아있음)
  if (params.competition === 'low') score += 20;
  else if (params.competition === 'mid') score += 10;
  else if (params.competition === 'high') score -= 5;

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
      });

      const reasons: string[] = [];
      if (kw.totalMonthly >= 1000 && kw.totalMonthly < 10000) {
        reasons.push('ideal_search_volume');
      }
      if (kw.competition === 'low') reasons.push('low_competition');
      else if (kw.competition === 'high') reasons.push('high_competition');

      // Find matching trend category
      const matchedCat = trendCategories.find(cat =>
        kw.keyword.includes(cat) || cat.includes(kw.keyword)
      ) ?? trendCategories[0] ?? 'general';

      opportunities.push({
        keyword: kw.keyword,
        category: matchedCat,
        monthlySearchVolume: kw.totalMonthly,
        competition: kw.competition,
        // 가격대·상품수는 쇼핑검색 없이는 알 수 없다 — 가짜값 대신 0(미확인)으로
        // 두고 Step 6에서 top5에 한해 실측 도매가로 보완한다.
        avgPrice: 0,
        minPrice: 0,
        maxPrice: 0,
        totalResults: 0,
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
    // 최저가가 이종상품 의심(outlier)이면 무의미한 정보라 그 다음 정상가를
    // 대신 보여준다(정상품 정보 손실 방지) — 전부 outlier면 최저가로 폴백.
    const normal = opp.wholesaleMatches?.find((w) => !w.priceOutlier);
    const top = normal ?? opp.wholesaleMatches?.[0];
    // outlier 경고는 필드 압축(#326-B)과 "이유를 알아야 한다"는 운영자 요구가
    // 상충하므로, 짧게라도 이유를 남긴다(완전 생략하지 않음).
    const outlierNote = top?.priceOutlier ? ' :warning:다른상품일수있음' : '';
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
