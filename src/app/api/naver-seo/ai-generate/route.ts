// src/app/api/naver-seo/ai-generate/route.ts
// AI SEO generator — 3 style modes: orthodox / emotional / niche
// Provider priority (Sprint 7-PC-D 2026-05-19):
//   1. Groq llama-3.3-70b-versatile (3 keys round-robin, free 43,200/day)
//   2. Anthropic Claude Sonnet (last-resort, cost-capped)
//
// DEPRECATED chains (removed in this commit):
//   - Perplexity sonar-pro (Pro plan expired 2026-05)
//   - Google Gemini 2.0 Flash (revoked due to backup file exposure)
//   - xAI Grok (cost-capped, not in primary stack)

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { analyzeCompetition, type CompetitionAnalysis } from '@/lib/naver/shopping-search';
import { callGroq, GROQ_MODEL } from '@/lib/ai/groq';

// ─── Style mode type ──────────────────────────────────────────────────────────

export const dynamic = 'force-dynamic';
type SeoStyle = 'orthodox' | 'emotional' | 'niche';

// ─── Prompt builders ──────────────────────────────────────────────────────────

function buildPrompt(productName: string, style: SeoStyle, market?: CompetitionAnalysis | null): string {
  const marketContext = market
    ? `\n[MARKET DATA — use this to optimize keywords and pricing strategy]
Competitors: ${market.totalResults.toLocaleString()} results (${market.competitionLevel})
Price range: ${market.minPrice.toLocaleString()}~${market.maxPrice.toLocaleString()} KRW (avg ${market.avgPrice.toLocaleString()})
Top sellers: ${market.topSellers.slice(0, 3).join(', ')}
- If HIGH/VERY_HIGH competition: use long-tail keywords, niche attributes
- If LOW/MEDIUM: use broad high-volume keywords\n`
    : '';
  const base = `Product name: ${productName}${marketContext}
Respond ONLY with a raw JSON object. No markdown, no explanation, no preamble. First char must be {.

{
  "naver_title": "...",
  "naver_keywords": "kw1,kw2,kw3,kw4,kw5,kw6,kw7",
  "naver_description": "...",
  "seo_title": "...",
  "seo_description": "..."
}`;

  const styleGuide: Record<SeoStyle, string> = {
    orthodox: `You are a Naver Smart Store SEO expert (2026 standards).
Style: Orthodox SEO — maximize search visibility with high-volume exact-match keywords.
Rules:
- naver_title: 25-35 Korean chars, primary keyword in first 15 chars, no filler words, no duplicate words 3+ times
- naver_keywords: 5-7 high search volume Korean keywords, comma-separated
- naver_description: 80-200 Korean chars, keywords naturally placed, factual and clear
- seo_title: 15-40 Korean chars, keyword-rich
- seo_description: 50-150 Korean chars, includes main keywords`,

    emotional: `You are a Korean e-commerce copywriter specializing in emotional targeting.
Style: Emotional / lifestyle — appeal to feelings, seasons, occasions, gifting moments.
Rules:
- naver_title: 25-35 Korean chars, evoke a feeling or occasion (e.g. 선물, 특별한, 일상), includes product keyword
- naver_keywords: 5-7 keywords mixing product terms with lifestyle/occasion terms
- naver_description: 80-200 Korean chars, warm tone, paint a scene of use
- seo_title: 15-40 Korean chars, emotionally resonant
- seo_description: 50-150 Korean chars, conversational and inviting`,

    niche: `You are a Naver Smart Store long-tail keyword specialist.
Style: Niche / long-tail — target less competitive specific search queries for higher conversion.
Rules:
- naver_title: 25-35 Korean chars, include specific attributes (material, use case, target user, size)
- naver_keywords: 5-7 long-tail Korean keywords (3+ word phrases preferred), very specific
- naver_description: 80-200 Korean chars, highly specific benefits and use cases
- seo_title: 15-40 Korean chars, specific niche angle
- seo_description: 50-150 Korean chars, speaks to a specific buyer persona`,
  };

  return `${styleGuide[style]}\n\n${base}`;
}

// ─── AI provider calls ────────────────────────────────────────────────────────

// Anthropic Claude Sonnet — last-resort fallback
async function callAnthropic(productName: string, style: SeoStyle, market?: CompetitionAnalysis | null): Promise<Record<string, string>> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514', max_tokens: 1000,
      system: '네이버 SEO 전문가. 순수 JSON만 반환. 마크다운 금지.',
      messages: [{ role: 'user', content: buildPrompt(productName, style, market) }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}`);
  const data = await res.json();
  return parseJsonSafe(data.content?.[0]?.text ?? '');
}

function parseJsonSafe(text: string): Record<string, string> {
  let t = text.trim().replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '').trim();
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start !== -1 && end !== -1) t = t.slice(start, end + 1);
  return JSON.parse(t);
}

async function generateSEO(
  productName: string,
  style: SeoStyle = 'orthodox',
  market?: CompetitionAnalysis | null
): Promise<{ data: Record<string, string>; provider: string; market?: CompetitionAnalysis | null }> {
  // Priority: Groq (free, 3 keys round-robin) → Anthropic Sonnet (last-resort)

  // 1. Groq first — free, fast, stable
  const hasGroqKey = !!(process.env.GROQ_API_KEY || process.env.GROQ_API_KEY_2 || process.env.GROQ_API_KEY_3);
  if (hasGroqKey) {
    try {
      const text = await callGroq(
        buildPrompt(productName, style, market),
        'Output ONLY raw JSON. First char must be {, last must be }. No markdown.',
      );
      return { data: parseJsonSafe(text), provider: `groq-${GROQ_MODEL}`, market };
    } catch (e) {
      console.warn('[ai-generate] All Groq keys failed, trying Anthropic:', e instanceof Error ? e.message.slice(0, 60) : e);
    }
  }

  // 2. Anthropic last-resort
  if (process.env.ANTHROPIC_API_KEY) {
    return { data: await callAnthropic(productName, style, market), provider: 'claude-sonnet', market };
  }

  throw new Error('AI 서비스 일시 응답 없음 (Groq + Anthropic 모두 실패). 잠시 후 다시 시도해주세요.');
}

// ─── POST: single product ─────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productId, productName, style = 'orthodox' } = body as {
      productId: string;
      productName: string;
      style?: SeoStyle;
    };

    // If productName not provided, fetch from DB using productId
    let resolvedName = productName;
    if (!resolvedName && productId && productId !== 'temp') {
      const found = await prisma.product.findUnique({ where: { id: productId }, select: { name: true } });
      resolvedName = found?.name ?? '';
    }

    if (!resolvedName) {
      return NextResponse.json({ success: false, error: '상품명이 필요합니다.' }, { status: 400 });
    }

    // C-12: Fetch competition data for smarter SEO (non-blocking — fallback to null)
    let market: CompetitionAnalysis | null = null;
    try {
      const hasOpenApiKey = !!(process.env.NAVER_OPENAPI_CLIENT_ID ?? process.env.NAVER_DATALAB_CLIENT_ID);
      if (hasOpenApiKey) {
        market = await analyzeCompetition(resolvedName);
      }
    } catch { /* non-critical — proceed without market data */ }

    const { data: aiResponse, provider } = await generateSEO(resolvedName, style as SeoStyle, market);

    if (productId && productId !== 'temp') {
      // Parse keywords from comma-separated string to JSON array
      const keywordsArray = (aiResponse.naver_keywords ?? '')
        .split(',')
        .map((k: string) => k.trim())
        .filter(Boolean);

      await prisma.product.update({
        where: { id: productId },
        data: {
          // Update main product name with AI-optimized title
          name: aiResponse.naver_title || undefined,
          // Update keywords JSON array (used by honey score + readiness)
          keywords: keywordsArray.length > 0 ? keywordsArray : undefined,
          // SEO-specific naver fields
          seo_title: aiResponse.seo_title || aiResponse.naver_title,
          seo_description: aiResponse.seo_description || (aiResponse.naver_description ?? '').substring(0, 160),
          naver_title: aiResponse.naver_title,
          naver_keywords: aiResponse.naver_keywords,
          naver_description: aiResponse.naver_description,
          // Record AI optimization timestamp
          aiGeneratedTitle: aiResponse.naver_title,
          updatedAt: new Date(),
        },
      });
    }

    return NextResponse.json({
      success: true, provider, style, data: aiResponse,
      ...(market ? { market: { competition: market.competitionLevel, avgPrice: market.avgPrice, totalResults: market.totalResults } } : {}),
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : '알 수 없는 오류';
    console.error('[api/naver-seo/ai-generate POST]', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// ─── PUT: bulk ────────────────────────────────────────────────────────────────
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { productIds, style = 'orthodox' } = body as { productIds: string[]; style?: SeoStyle };

    if (!Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json({ success: false, error: '상품 ID 배열이 필요합니다.' }, { status: 400 });
    }

    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true },
    });

    let successCount = 0;
    let failCount = 0;
    const results = [];

    for (const product of products) {
      try {
        const { data: aiResponse } = await generateSEO(product.name, style as SeoStyle);
        const keywordsArray = (aiResponse.naver_keywords ?? '')
          .split(',')
          .map((k: string) => k.trim())
          .filter(Boolean);
        await prisma.product.update({
          where: { id: product.id },
          data: {
            name: aiResponse.naver_title || undefined,
            keywords: keywordsArray.length > 0 ? keywordsArray : undefined,
            seo_title: aiResponse.seo_title || aiResponse.naver_title,
            seo_description: aiResponse.seo_description || (aiResponse.naver_description ?? '').substring(0, 160),
            naver_title: aiResponse.naver_title,
            naver_keywords: aiResponse.naver_keywords,
            naver_description: aiResponse.naver_description,
            aiGeneratedTitle: aiResponse.naver_title,
            updatedAt: new Date(),
          },
        });
        results.push({ productId: product.id, productName: product.name, success: true });
        successCount++;
        await new Promise(r => setTimeout(r, 500)); // rate-limit buffer
      } catch (err) {
        results.push({ productId: product.id, productName: product.name, success: false, error: String(err) });
        failCount++;
      }
    }

    return NextResponse.json({ success: true, successCount, failCount, results });
  } catch (error) {
    const msg = error instanceof Error ? error.message : '알 수 없는 오류';
    console.error('[api/naver-seo/ai-generate PUT]', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
