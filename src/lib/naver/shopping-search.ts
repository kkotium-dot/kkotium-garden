// src/lib/naver/shopping-search.ts
// C-12: Naver Open API shopping search + DataLab trend analysis
// Replaces PlayMCP functionality with direct API calls (free tier)
// Used by: SEO optimizer, Kkotti recommendations, competition analysis
//
// Required env vars (Naver Developer Center - openapi):
//   NAVER_OPENAPI_CLIENT_ID     — developers.naver.com application
//   NAVER_OPENAPI_CLIENT_SECRET — same application
// These are DIFFERENT from Commerce API keys (NAVER_CLIENT_ID/SECRET)

const OPENAPI_BASE = 'https://openapi.naver.com/v1';
const DATALAB_BASE = 'https://openapi.naver.com/v1/datalab';

function getOpenApiHeaders(): Record<string, string> {
  const clientId = process.env.NAVER_OPENAPI_CLIENT_ID
    ?? process.env.NAVER_DATALAB_CLIENT_ID
    ?? '';
  const clientSecret = process.env.NAVER_OPENAPI_CLIENT_SECRET
    ?? process.env.NAVER_DATALAB_CLIENT_SECRET
    ?? '';

  if (!clientId || !clientSecret) {
    throw new Error('NAVER_OPENAPI_CLIENT_ID/SECRET not configured');
  }

  return {
    'X-Naver-Client-Id': clientId,
    'X-Naver-Client-Secret': clientSecret,
    'Content-Type': 'application/json',
  };
}

// ── Shopping Search API ──────────────────────────────────────────────────────

export interface ShoppingItem {
  title: string;
  link: string;
  image: string;
  lprice: string;
  hprice: string;
  mallName: string;
  productId: string;
  category1: string;
  category2: string;
  category3: string;
  brand: string;
  maker: string;
}

export interface ShoppingSearchResult {
  total: number;
  items: ShoppingItem[];
}

/** Search Naver Shopping for competitive products */
export async function searchShopping(
  query: string,
  options?: { display?: number; sort?: 'sim' | 'date' | 'asc' | 'dsc'; start?: number }
): Promise<ShoppingSearchResult> {
  const params = new URLSearchParams({
    query,
    display: String(options?.display ?? 10),
    sort: options?.sort ?? 'sim',
    start: String(options?.start ?? 1),
  });

  const res = await fetch(`${OPENAPI_BASE}/search/shop.json?${params}`, {
    headers: getOpenApiHeaders(),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Naver Shopping Search failed: ${res.status} — ${err}`);
  }

  const data = await res.json();
  return {
    total: data.total ?? 0,
    items: (data.items ?? []).map((item: any) => ({
      ...item,
      title: item.title?.replace(/<\/?b>/g, '') ?? '', // strip bold tags
    })),
  };
}

// ── DataLab Shopping Trend API ───────────────────────────────────────────────

export interface TrendDataPoint {
  period: string;
  ratio: number;
}

export interface CategoryTrendResult {
  title: string;
  data: TrendDataPoint[];
}

/** Get shopping category trend data (like PlayMCP datalab_shopping_category) */
export async function getShoppingCategoryTrend(
  categories: Array<{ name: string; param: string[] }>,
  options?: { startDate?: string; endDate?: string; timeUnit?: 'date' | 'week' | 'month' }
): Promise<CategoryTrendResult[]> {
  const now = new Date();
  const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  const body = {
    startDate: options?.startDate ?? fmt(threeMonthsAgo),
    endDate: options?.endDate ?? fmt(now),
    timeUnit: options?.timeUnit ?? 'month',
    category: categories,
  };

  const res = await fetch(`${DATALAB_BASE}/shopping/categories`, {
    method: 'POST',
    headers: getOpenApiHeaders(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`DataLab category trend failed: ${res.status} — ${err}`);
  }

  const data = await res.json();
  return (data.results ?? []).map((r: any) => ({
    title: r.title,
    data: r.data ?? [],
  }));
}

/** Get shopping keyword trend within a category */
export async function getShoppingKeywordTrend(
  category: string,
  keywords: Array<{ name: string; param: string[] }>,
  options?: { startDate?: string; endDate?: string; timeUnit?: 'date' | 'week' | 'month' }
): Promise<CategoryTrendResult[]> {
  const now = new Date();
  const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  const body = {
    startDate: options?.startDate ?? fmt(threeMonthsAgo),
    endDate: options?.endDate ?? fmt(now),
    timeUnit: options?.timeUnit ?? 'month',
    category,
    keyword: keywords,
  };

  const res = await fetch(`${DATALAB_BASE}/shopping/category/keywords`, {
    method: 'POST',
    headers: getOpenApiHeaders(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`DataLab keyword trend failed: ${res.status} — ${err}`);
  }

  const data = await res.json();
  return (data.results ?? []).map((r: any) => ({
    title: r.title,
    data: r.data ?? [],
  }));
}

// ── Competition Analysis (combines search + trend) ──────────────────────────

export interface CompetitionAnalysis {
  query: string;
  totalResults: number;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  topSellers: string[];
  priceRange: string;
  competitionLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
}

/** Analyze competition for a product keyword */
export async function analyzeCompetition(query: string): Promise<CompetitionAnalysis> {
  const result = await searchShopping(query, { display: 10, sort: 'sim' });

  const prices = result.items
    .map(i => Number(i.lprice))
    .filter(p => p > 0);

  const avgPrice = prices.length > 0
    ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)
    : 0;

  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;

  const sellers = [...new Set(result.items.map(i => i.mallName).filter(Boolean))];

  // Competition level based on total results
  const level: CompetitionAnalysis['competitionLevel'] =
    result.total > 100000 ? 'VERY_HIGH' :
    result.total > 30000  ? 'HIGH' :
    result.total > 5000   ? 'MEDIUM' : 'LOW';

  return {
    query,
    totalResults: result.total,
    avgPrice,
    minPrice,
    maxPrice,
    topSellers: sellers.slice(0, 5),
    priceRange: `${minPrice.toLocaleString()}~${maxPrice.toLocaleString()}`,
    competitionLevel: level,
  };
}

// ── Groq AI Analysis (free 14,400/day) ──────────────────────────────────────

export interface MarketInsight {
  summary: string;
  priceSuggestion: string;
  keywordSuggestions: string[];
  competitorTip: string;
  source: 'groq' | 'fallback';
}

/** Generate market insight using Groq AI (free) + shopping data */
export async function generateMarketInsight(
  productName: string,
  competitionData: CompetitionAnalysis,
  trendData?: CategoryTrendResult[],
): Promise<MarketInsight> {
  const groqKey = process.env.GROQ_API_KEY;

  if (!groqKey) {
    return {
      summary: `${productName}: ${competitionData.totalResults.toLocaleString()} results, avg ${competitionData.avgPrice.toLocaleString()} KRW`,
      priceSuggestion: `${competitionData.minPrice.toLocaleString()}~${competitionData.avgPrice.toLocaleString()} KRW range recommended`,
      keywordSuggestions: [],
      competitorTip: `Top sellers: ${competitionData.topSellers.join(', ')}`,
      source: 'fallback',
    };
  }

  const trendSummary = trendData?.map(t => {
    const latest = t.data[t.data.length - 1];
    const prev = t.data[t.data.length - 2];
    const change = prev ? ((latest?.ratio ?? 0) - prev.ratio).toFixed(1) : 'N/A';
    return `${t.title}: latest ratio ${latest?.ratio?.toFixed(1) ?? 'N/A'}, change ${change}`;
  }).join('; ') ?? 'no trend data';

  const prompt = `You are a Naver Smart Store SEO expert. Analyze this product market data and respond in Korean JSON only.

Product: ${productName}
Competition: ${competitionData.totalResults} results, avg price ${competitionData.avgPrice}KRW, range ${competitionData.priceRange}
Competition Level: ${competitionData.competitionLevel}
Top Sellers: ${competitionData.topSellers.join(', ')}
Trend: ${trendSummary}

Respond ONLY with JSON:
{
  "summary": "market analysis in Korean (2-3 sentences)",
  "priceSuggestion": "pricing advice in Korean",
  "keywordSuggestions": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "competitorTip": "competitor strategy tip in Korean"
}`;

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500,
        temperature: 0.3,
      }),
    });

    if (!res.ok) throw new Error(`Groq API error: ${res.status}`);

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content ?? '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');

    const parsed = JSON.parse(jsonMatch[0]);
    return { ...parsed, source: 'groq' as const };
  } catch {
    return {
      summary: `${productName}: ${competitionData.competitionLevel} competition, avg ${competitionData.avgPrice.toLocaleString()} KRW`,
      priceSuggestion: `${competitionData.minPrice.toLocaleString()}~${competitionData.avgPrice.toLocaleString()} KRW`,
      keywordSuggestions: [],
      competitorTip: `Top sellers: ${competitionData.topSellers.join(', ')}`,
      source: 'fallback',
    };
  }
}
