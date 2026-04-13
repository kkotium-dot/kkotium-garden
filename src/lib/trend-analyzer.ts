// src/lib/trend-analyzer.ts
// A-8: Naver DataLab Shopping Insight API (primary) + Perplexity (fallback)
// DataLab API: free, requires NAVER_CLIENT_ID + NAVER_CLIENT_SECRET_OPEN (separate from Commerce API)
// Endpoint: https://openapi.naver.com/v1/datalab/shopping/categories
// Falls back to Perplexity sonar-pro if DataLab key not configured

const PERPLEXITY_URL  = 'https://api.perplexity.ai/chat/completions';
const DATALAB_URL     = 'https://openapi.naver.com/v1/datalab/shopping/categories';

export interface TrendResult {
  trendKeywords:   string[];
  trendCategories: string[];
  source: 'datalab' | 'perplexity' | 'fallback';
}

export interface TrendMatchResult {
  productId:       string;
  productName:     string;
  matchedKeywords: string[];
  boostScore:      number;   // +5 ~ +20 pts added to honey score
}

// Naver DataLab category codes (top 10 shopping categories)
const DATALAB_CATEGORIES = [
  { name: '패션의류',   param: '50000000' },
  { name: '패션잡화',   param: '50000001' },
  { name: '화장품/미용', param: '50000002' },
  { name: '디지털/가전', param: '50000003' },
  { name: '가구/인테리어', param: '50000004' },
  { name: '출산/육아',  param: '50000005' },
  { name: '식품',       param: '50000006' },
  { name: '스포츠/레저', param: '50000007' },
  { name: '생활/건강',  param: '50000008' },
  { name: '여가/생활편의', param: '50000009' },
];

// ── A-8: Naver DataLab Shopping Insight ──────────────────────────────────
async function fetchDataLabTrends(): Promise<TrendResult | null> {
  // DataLab uses separate Open API keys (not Commerce API keys)
  const clientId     = process.env.NAVER_DATALAB_CLIENT_ID
                    ?? process.env.NAVER_OPEN_API_CLIENT_ID
                    ?? process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_DATALAB_CLIENT_SECRET
                    ?? process.env.NAVER_OPEN_API_CLIENT_SECRET;

  if (!clientId || !clientSecret) return null;

  try {
    // Build date range: last 7 days
    const endDate   = new Date();
    const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fmt = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    const body = {
      startDate: fmt(startDate),
      endDate:   fmt(endDate),
      timeUnit:  'date',
      category:  DATALAB_CATEGORIES.map(c => ({
        name:   c.name,
        param:  [c.param],
      })),
    };

    const res = await fetch(DATALAB_URL, {
      method:  'POST',
      headers: {
        'Content-Type':          'application/json',
        'X-Naver-Client-Id':     clientId,
        'X-Naver-Client-Secret': clientSecret,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) return null;

    const data = await res.json();
    const results: Array<{ title: string; data: Array<{ period: string; ratio: number }> }> =
      data.results ?? [];

    if (results.length === 0) return null;

    // Get latest day ratio for each category, sort by ratio desc
    const ranked = results
      .map(r => {
        const latest = r.data[r.data.length - 1];
        return { name: r.title, ratio: latest?.ratio ?? 0 };
      })
      .sort((a, b) => b.ratio - a.ratio);

    // Top 3 categories → trend categories
    const trendCategories = ranked.slice(0, 3).map(r => r.name);

    // Derive trend keywords from top category names + common search terms
    const trendKeywords = trendCategories
      .flatMap(cat => {
        const KW_MAP: Record<string, string[]> = {
          '패션의류':    ['원피스', '반팔티'],
          '패션잡화':    ['가방', '지갑'],
          '화장품/미용': ['선크림', '마스크팩'],
          '가구/인테리어': ['수납장', '조명'],
          '생활/건강':  ['청소기', '공기청정기'],
          '식품':        ['건강식품', '간식'],
          '스포츠/레저': ['요가매트', '운동복'],
          '출산/육아':  ['기저귀', '유아용품'],
          '디지털/가전': ['이어폰', '충전기'],
          '여가/생활편의': ['캠핑용품', '여행가방'],
        };
        return KW_MAP[cat] ?? [cat];
      })
      .slice(0, 5);

    return { trendKeywords, trendCategories, source: 'datalab' };
  } catch {
    return null;
  }
}

// ── Perplexity fallback (unchanged from original) ─────────────────────────
async function fetchPerplexityTrends(): Promise<TrendResult> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) return { trendKeywords: [], trendCategories: [], source: 'fallback' };

  const today = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  const prompt = `${today} 기준 네이버 쇼핑에서 인기 급상승 키워드와 카테고리 TOP 5를 알려주세요.
JSON 형식으로만 답해주세요. 다른 설명 없이:
{"trendKeywords":["키워드1","키워드2","키워드3","키워드4","키워드5"],"trendCategories":["카테고리1","카테고리2","카테고리3"]}`;

  try {
    const res = await fetch(PERPLEXITY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'sonar-pro',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 200,
        temperature: 0.3,
      }),
    });

    if (!res.ok) return { trendKeywords: [], trendCategories: [], source: 'fallback' };

    const data  = await res.json();
    const text  = data.choices?.[0]?.message?.content?.trim() ?? '';
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    return {
      trendKeywords:   Array.isArray(parsed.trendKeywords)   ? parsed.trendKeywords.slice(0, 5)   : [],
      trendCategories: Array.isArray(parsed.trendCategories) ? parsed.trendCategories.slice(0, 3) : [],
      source: 'perplexity',
    };
  } catch {
    return { trendKeywords: [], trendCategories: [], source: 'fallback' };
  }
}

// ── A-8: Main export — DataLab first, Perplexity fallback ─────────────────
export async function fetchNaverTrends(): Promise<TrendResult> {
  // Try DataLab first (free, reliable)
  const datalab = await fetchDataLabTrends();
  if (datalab && datalab.trendKeywords.length > 0) return datalab;

  // Silent fallback — Perplexity removed (Pro plan required)
  // Cron continues without trend data; keyword volume re-ranking still works
  return { trendKeywords: [], source: 'fallback' };
}

// ── Match DB products against trend keywords ──────────────────────────────
export function matchProductsToTrends(
  products: Array<{
    id: string;
    name: string;
    keywords?: unknown;
    tags?: unknown;
  }>,
  trends: TrendResult
): TrendMatchResult[] {
  if (trends.trendKeywords.length === 0) return [];

  const results: TrendMatchResult[] = [];

  for (const p of products) {
    const keywords  = Array.isArray(p.keywords) ? (p.keywords as string[]) : [];
    const tags      = Array.isArray(p.tags)     ? (p.tags     as string[]) : [];
    const nameWords = p.name.toLowerCase().split(/\s+/);

    const matched = trends.trendKeywords.filter(tw => {
      const twLower = tw.toLowerCase();
      return (
        p.name.toLowerCase().includes(twLower) ||
        keywords.some(k => k.toLowerCase().includes(twLower)) ||
        tags.some(t => t.toLowerCase().includes(twLower)) ||
        nameWords.some(w => w.includes(twLower))
      );
    });

    if (matched.length > 0) {
      const boostScore = Math.min(matched.length * 5, 20);
      results.push({ productId: p.id, productName: p.name, matchedKeywords: matched, boostScore });
    }
  }

  return results.sort((a, b) => b.boostScore - a.boostScore);
}
