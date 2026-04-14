// src/lib/sourcing-recommender.ts
// E-7: Kkotti Sourcing Recommender Bot
// Analyzes Naver trends + keyword stats + competition data
// to recommend blue-ocean product opportunities for sourcing
// Runs daily via cron and pushable to Discord #kkotti-daily

import { fetchNaverTrends, type TrendResult } from '@/lib/trend-analyzer';
import { searchShopping, analyzeCompetition, type CompetitionAnalysis } from '@/lib/naver/shopping-search';
import { fetchKeywordStats, type KeywordStat } from '@/lib/naver/keyword-api';

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
}

export interface SourcingRecommendResult {
  date: string;
  trendSource: string;
  trendCategories: string[];
  opportunities: SourcingOpportunity[];
  aiSummary?: string;
  error?: string;
}

// ── Category-to-keyword expansion map ────────────────────────────────────────
// Maps DataLab broad categories to actionable product search keywords
const CATEGORY_KEYWORD_MAP: Record<string, string[]> = {
  // Home/living (main focus for KKOTIUM)
  'home_living': [
    'LED', 'USB', 'HDMI',
  ],
  // Expand DataLab categories to specific product keywords
  'default': [],
};

// DataLab category name to product keyword mapping
const DATALAB_TO_KEYWORDS: Record<string, string[]> = {
  // Korean category names from DataLab API
  'home_living_default': [
    'LED', 'USB', 'HDMI',
  ],
};

// Generate search keywords from trending category names
function expandCategoryToKeywords(categoryName: string): string[] {
  // Map Korean DataLab category names to product-level search keywords
  const KW: Record<string, string[]> = {
    // Broader keyword expansion based on category
  };

  // Fallback: use the category name as-is for keyword search
  return KW[categoryName] ?? [categoryName];
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
      : ['home_living']; // default for KKOTIUM

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
    for (let i = 0; i < uniqueKeywords.length; i += 5) {
      const batch = uniqueKeywords.slice(i, i + 5);
      try {
        const stats = await fetchKeywordStats(batch);
        keywordStats.push(...stats);
      } catch {
        // Skip batch on error, continue with remaining
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

    for (const kw of promising) {
      try {
        const comp = await analyzeCompetition(kw.keyword);

        // Estimate supply price as ~35% of avg price (typical wholesale margin)
        const suggestedSupplyPrice = Math.round(comp.avgPrice * 0.35);
        const estimatedMargin = comp.avgPrice > 0
          ? Math.round(((comp.avgPrice - suggestedSupplyPrice - comp.avgPrice * 0.058) / comp.avgPrice) * 100)
          : 0;

        const blueOceanScore = calcBlueOceanScore({
          monthlyVolume: kw.totalMonthly,
          competition: kw.competition,
          totalResults: comp.totalResults,
          avgPrice: comp.avgPrice,
        });

        // Build reason string
        const reasons: string[] = [];
        if (kw.totalMonthly >= 1000 && kw.totalMonthly < 10000) {
          reasons.push('ideal_search_volume');
        }
        if (kw.competition === 'low') reasons.push('low_competition');
        if (comp.totalResults < 5000) reasons.push('few_competitors');
        if (comp.avgPrice >= 10000 && comp.avgPrice <= 50000) reasons.push('good_price_range');

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
        });

        // Rate limit between competition checks
        await new Promise(r => setTimeout(r, 300));
      } catch {
        // Skip this keyword on error
      }
    }

    // Sort by blue ocean score descending
    opportunities.sort((a, b) => b.blueOceanScore - a.blueOceanScore);

    // Step 5: Generate AI insights for top opportunities
    const aiResult = await generateAiInsight(opportunities, trendCategories);

    // Apply AI insights to each opportunity
    for (const opp of opportunities) {
      const tip = aiResult.perItem.get(opp.keyword);
      if (tip) opp.aiInsight = tip;
    }

    return {
      date: today,
      trendSource: trends.source,
      trendCategories,
      opportunities: opportunities.slice(0, 5), // top 5 only
      aiSummary: aiResult.summary || undefined,
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

export function buildSourcingRecommendEmbed(result: SourcingRecommendResult): Record<string, unknown> {
  const RANK_ICONS = [':first_place:', ':second_place:', ':third_place:', ':four:', ':five:'];
  const COMP_LABEL: Record<string, string> = {
    low: ':green_circle: low',
    mid: ':yellow_circle: mid',
    high: ':red_circle: high',
    unknown: ':white_circle: -',
  };

  const fields: Record<string, unknown>[] = result.opportunities.map((opp, i) => {
    const marginColor = opp.estimatedMargin >= 30 ? ':green_heart:' : opp.estimatedMargin >= 20 ? ':yellow_heart:' : ':broken_heart:';
    return {
      name: `${RANK_ICONS[i] ?? `${i + 1}.`} ${opp.keyword} (${opp.blueOceanScore}pt)`,
      value: [
        `${COMP_LABEL[opp.competition] ?? ''} | ${opp.monthlySearchVolume.toLocaleString()}/month | ${opp.totalResults.toLocaleString()} results`,
        `avg **${opp.avgPrice.toLocaleString()}** (${opp.minPrice.toLocaleString()}~${opp.maxPrice.toLocaleString()})`,
        `${marginColor} est.margin **${opp.estimatedMargin}%** | supply ~${opp.suggestedSupplyPrice.toLocaleString()}`,
        opp.topSellers.length > 0 ? `top: ${opp.topSellers.join(' / ')}` : null,
        opp.aiInsight ? `> ${opp.aiInsight}` : null,
      ].filter(Boolean).join('\n'),
      inline: false,
    };
  });

  // Trend info field
  if (result.trendCategories.length > 0) {
    fields.unshift({
      name: ':chart_with_upwards_trend: trending categories',
      value: result.trendCategories.join(' / ') + ` (${result.trendSource})`,
      inline: false,
    });
  }

  const description = [
    result.aiSummary ?? 'DataLab trend + keyword analysis complete.',
    '',
    result.opportunities.length > 0
      ? `**${result.opportunities.length}** blue-ocean found. Supply search recommended!`
      : 'No clear opportunities today. Check again tomorrow.',
  ].join('\n');

  return {
    title: `:tulip: sourcing recommendation - ${result.date}`,
    description,
    color: 0xff6b8a, // KKOTIUM pink
    fields,
    footer: { text: 'KKOTIUM Garden - Kkotti Sourcing Bot' },
    timestamp: new Date().toISOString(),
  };
}
