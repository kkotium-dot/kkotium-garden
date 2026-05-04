// src/app/api/kkotti-comment/route.ts
// Kkotti AI comment generator — Gemini 2.0 Flash with Perplexity fallback
// POST { products: ProductSummary[], context: string }
// Returns { comment: string, source: 'gemini' | 'perplexity' | 'fallback' }

import { NextRequest, NextResponse } from 'next/server';
import { analyzeCompetition } from '@/lib/naver/shopping-search';
import { buildPersonaBlock } from '@/lib/kkotti-vocab';


export const dynamic = 'force-dynamic';
const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
const PERPLEXITY_URL = 'https://api.perplexity.ai/chat/completions';

// ── 24-hour in-memory cache ───────────────────────────────────────────────────
interface CacheEntry { comment: string; source: string; ts: number }
const COMMENT_CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS  = 24 * 60 * 60 * 1000; // 24h

function getCacheKey(context: string, products: ProductSummary[]): string {
  // Key = context + sorted product ids/names (stable across re-renders)
  const ids = products
    .slice(0, 5)
    .map(p => `${p.name}:${p.score ?? 0}:${p.readiness ?? 0}`)
    .sort()
    .join('|');
  return `${context}::${ids}`;
}

function getCache(key: string): CacheEntry | null {
  const entry = COMMENT_CACHE.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) {
    COMMENT_CACHE.delete(key);
    return null;
  }
  return entry;
}

function setCache(key: string, comment: string, source: string): void {
  // Keep cache small — evict oldest if > 200 entries
  if (COMMENT_CACHE.size >= 200) {
    const oldest = [...COMMENT_CACHE.entries()].sort((a, b) => a[1].ts - b[1].ts)[0];
    if (oldest) COMMENT_CACHE.delete(oldest[0]);
  }
  COMMENT_CACHE.set(key, { comment, source, ts: Date.now() });
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface ProductSummary {
  name: string;
  score?: number;
  margin?: number;
  keywords?: string[];
  tags?: string[];
  categoryName?: string;
  readiness?: number; // 0-100 upload readiness score
}

// ── Kkotti persona ────────────────────────────────────────────────────────────
// Sourced from src/lib/kkotti-vocab.ts (workflow redesign Part A1a, 2026-05-03).
// buildPersonaBlock() centralizes the persona definition so vocab pools and
// signature catchphrases ("빵야~", "까꿍") stay synchronized with the
// dashboard KkottiBriefingWidget.
const KKOTTI_PERSONA = buildPersonaBlock();

// ── Static fallbacks (last resort) ───────────────────────────────────────────
const FALLBACKS: Record<string, string[]> = {
  daily: [
    '등록 대기 상품부터요! 검색 조련사에서 SEO 점수 60점 이상 만들면 노출 확률 2배예요.',
    '오늘 키워드 태그 10개 꽉 채운 상품 1개만 등록해도 달라져요. 준비도 +8점이거든요!',
    '카테고리 미설정 상품이 있으면 지금 바로 설정해요. SEO 25점이 그냥 날아가고 있어요!',
  ],
  slot_a: [
    '꿀통지수 높은 상품이에요. 카테고리랑 SEO 태그만 완성하면 바로 등록할 수 있어요!',
    '헉, 마진이 좋네요! 검색 조련사에서 AI 상품명 돌리면 클릭률 확 올라갈 거예요.',
    '대표 이미지 퀄리티가 클릭률에 제일 크게 영향줘요. 고화질로 교체해봐요!',
  ],
  zombie: [
    '헉 좀비 상품이에요! 상품명 바꾸고 새로 등록하면 최신성 점수 올라가요.',
    '부활 작전 시작해요! 복제 후 SEO 태그 10개 새로 채워서 다시 올려봐요.',
  ],
  low_margin: [
    '마진이 빡빡해요. 판매가를 5~10% 올리거나 묶음배송 조건 바꿔봐요!',
    '손익분기점 아슬아슬해요. 광고비 + 반품률까지 계산하면 적자 날 수 있어요!',
  ],
};

function getFallback(context: string): string {
  const pool = FALLBACKS[context] ?? FALLBACKS.daily;
  return pool[Math.floor(Math.random() * pool.length)];
}

// ── Prompt builder ────────────────────────────────────────────────────────────
function buildPrompt(context: string, products: ProductSummary[], marketData?: string): string {
  const productList = products.slice(0, 5).map((p, i) => {
    const parts = [
      `${i + 1}. ${p.name}`,
      p.score     !== undefined ? `꿀통지수 ${p.score}점` : null,
      p.margin    !== undefined ? `순마진 ${p.margin.toFixed(1)}%` : null,
      p.readiness !== undefined ? `업로드준비도 ${p.readiness}%` : null,
      p.categoryName            ? `카테고리 [${p.categoryName}]` : '카테고리 미설정',
      (p.keywords?.length ?? 0) > 0 ? `키워드 ${p.keywords!.length}개` : '키워드 없음',
      (p.tags?.length ?? 0) > 0     ? `태그 ${p.tags!.length}개` : '태그 없음',
    ].filter(Boolean).join(', ');
    return parts;
  }).join('\n');

  const marketInsight = marketData
    ? `\n[MARKET DATA]\n${marketData}\n`
    : '';

  const contextPrompts: Record<string, string> = {
    daily:
      `오늘 등록 후보 TOP ${products.length}개:\n${productList}\n${marketInsight}\n`
      + `위 데이터 기반으로 오늘 가장 먼저 해야 할 액션 1가지를 구체적 수치와 함께 알려주세요. (120자 이내)`,
    slot_a:
      `꿀통지수 상위 추천 상품:\n${productList}\n\n`
      + `공통 개선점과 SEO 전략 1가지를 구체적 점수/퍼센트와 함께. (120자 이내)`,
    zombie:
      `부활 후보 좀비 상품:\n${productList}\n\n`
      + `가장 살릴 가능성 높은 상품과 구체적 부활 방법. (120자 이내)`,
    low_margin:
      `마진 위험 상품:\n${productList}\n\n`
      + `손익 개선을 위한 현실적 조언 1가지 (구체적 수치 포함). (120자 이내)`,
  };

  return `${KKOTTI_PERSONA}\n\n${contextPrompts[context] ?? contextPrompts.daily}`;
}

// ── Gemini call ───────────────────────────────────────────────────────────────
async function callGemini(prompt: string, apiKey: string): Promise<string | null> {
  try {
    const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.85, maxOutputTokens: 150, topP: 0.9 },
      }),
    });
    if (res.status === 429 || !res.ok) return null;
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim().slice(0, 120) ?? null;
  } catch {
    return null;
  }
}

// ── Perplexity fallback call ──────────────────────────────────────────────────
async function callPerplexity(prompt: string, apiKey: string): Promise<string | null> {
  try {
    const res = await fetch(PERPLEXITY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'sonar-pro',
        messages: [
          { role: 'system', content: KKOTTI_PERSONA },
          { role: 'user',   content: prompt },
        ],
        max_tokens: 150,
        temperature: 0.8,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim().slice(0, 120) ?? null;
  } catch {
    return null;
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const { products = [], context = 'daily' } = await request.json();

    // Empty products — instant fallback, no cache needed
    if (!products || products.length === 0) {
      const emptyFallbacks: Record<string, string> = {
        daily:  '상품을 등록하면 꼬띠가 매일 전략을 짜드릴게요. 씨앗 심기로 가볼까요?',
        slot_a: '꿀통지수 70점 이상 상품이 없어요. 검색 조련사에서 SEO 점수를 올려주세요!',
        zombie: '좀비 상품이 없다는 건 관리가 잘 되고 있다는 뜻이에요. 훌륭해요!',
      };
      return NextResponse.json({
        success: true,
        comment: emptyFallbacks[context] ?? emptyFallbacks.daily,
        source: 'fallback',
      });
    }

    // Cache check
    const cacheKey   = getCacheKey(context, products as ProductSummary[]);
    const cached     = getCache(cacheKey);
    if (cached) {
      return NextResponse.json({ success: true, comment: cached.comment, source: `${cached.source}:cached` });
    }

    // C-12: Fetch market data for top product (non-blocking)
    let marketData = '';
    try {
      const hasOpenApiKey = !!(process.env.NAVER_OPENAPI_CLIENT_ID ?? process.env.NAVER_DATALAB_CLIENT_ID);
      if (hasOpenApiKey && products.length > 0) {
        const topProduct = (products as ProductSummary[])[0];
        const market = await analyzeCompetition(topProduct.name);
        marketData = `${topProduct.name}: ${market.totalResults.toLocaleString()} competitors (${market.competitionLevel}), avg ${market.avgPrice.toLocaleString()} KRW`;
      }
    } catch { /* non-critical */ }

    const prompt        = buildPrompt(context, products as ProductSummary[], marketData || undefined);
    const geminiKey     = process.env.GEMINI_API_KEY;
    const perplexityKey = process.env.PERPLEXITY_API_KEY;

    let comment: string | null = null;
    let source  = 'fallback';

    // 1. Try Gemini
    if (geminiKey) {
      comment = await callGemini(prompt, geminiKey);
      if (comment) source = 'gemini';
    }

    // 2. Gemini failed / rate-limited → try Perplexity
    if (!comment && perplexityKey) {
      comment = await callPerplexity(prompt, perplexityKey);
      if (comment) source = 'perplexity';
    }

    // 3. Both failed → static fallback
    if (!comment) {
      comment = getFallback(context);
      source  = 'fallback';
    }

    // Cache the result (even fallbacks — prevents hammering APIs)
    setCache(cacheKey, comment, source);

    return NextResponse.json({ success: true, comment, source });
  } catch (e: unknown) {
    console.error('[KkottiComment] Exception:', e);
    return NextResponse.json({ success: true, comment: getFallback('daily'), source: 'fallback' });
  }
}
