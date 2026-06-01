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
import {
  fetchKeywordVolumes,
  normalizeKeyword,
  type VolumeRow,
} from '@/lib/naver/searchad-volume';
import { callGroq, GROQ_MODEL } from '@/lib/ai/groq';

// ─── Style mode type ──────────────────────────────────────────────────────────

export const dynamic = 'force-dynamic';
type SeoStyle = 'orthodox' | 'emotional' | 'niche';

// ─── Search volume helpers (Lane 1, 2026-06-01) ───────────────────────────────

/** Build the candidate keyword pool that gets SearchAd-priced BEFORE the AI
 *  call. SearchAd's /keywordstool empirically rejects multi-word hints
 *  containing internal spaces with HTTP 400 — so we use SPACE-SPLIT TOKENS
 *  only (>= 2 chars, <= 15 chars). The pool is capped at 10 so we never
 *  exceed two SearchAd batches. */
function extractCandidateKeywords(productName: string): string[] {
  const cleaned = (productName ?? '')
    .replace(/[,\.\(\)\[\]\/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return [];
  const tokens = cleaned
    .split(' ')
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && t.length <= 15);
  const pool: string[] = [];
  const seen = new Set<string>();
  for (const k of tokens) {
    const n = normalizeKeyword(k);
    if (seen.has(n)) continue;
    seen.add(n);
    pool.push(k);
    if (pool.length >= 10) break;
  }
  return pool;
}

/** Render the measured search-volume rows as an additional prompt section.
 *  Sorted by descending total volume so the AI sees the highest-impact
 *  keywords first. Workrule #46: never fabricate counts — only print what
 *  SearchAd returned. */
function renderVolumeContext(rows: VolumeRow[]): string {
  if (rows.length === 0) return '';
  const sorted = [...rows].sort(
    (a, b) => b.totalMonthlyQc - a.totalMonthlyQc,
  );
  const lines = sorted
    .slice(0, 10)
    .map(
      (r) =>
        `- "${r.keyword}": PC ${r.monthlyPcQc.toLocaleString('en-US')} + Mobile ${r.monthlyMobileQc.toLocaleString('en-US')} = ${r.totalMonthlyQc.toLocaleString('en-US')}/mo, comp ${r.compIdx ?? 'unknown'}`,
    )
    .join('\n');
  return `\n[SEARCH VOLUME DATA — Naver SearchAd /keywordstool, measured monthly counts]
${lines}
- The HIGHEST-volume keyword MUST appear within the first 15 characters of naver_title.
- naver_keywords MUST be ordered by descending measured volume — high-volume first.
- Do NOT invent or guess volume figures for unmeasured keywords (workrule #46).\n`;
}

// ─── Prompt builders ──────────────────────────────────────────────────────────

function buildPrompt(
  productName: string,
  style: SeoStyle,
  market?: CompetitionAnalysis | null,
  volumes?: VolumeRow[] | null,
): string {
  const marketContext = market
    ? `\n[MARKET DATA — use this to optimize keywords and pricing strategy]
Competitors: ${market.totalResults.toLocaleString()} results (${market.competitionLevel})
Price range: ${market.minPrice.toLocaleString()}~${market.maxPrice.toLocaleString()} KRW (avg ${market.avgPrice.toLocaleString()})
Top sellers: ${market.topSellers.slice(0, 3).join(', ')}
- If HIGH/VERY_HIGH competition: use long-tail keywords, niche attributes
- If LOW/MEDIUM: use broad high-volume keywords\n`
    : '';
  const volumeContext = volumes && volumes.length > 0
    ? renderVolumeContext(volumes)
    : '';
  const base = `Product name: ${productName}${marketContext}${volumeContext}
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
async function callAnthropic(
  productName: string,
  style: SeoStyle,
  market?: CompetitionAnalysis | null,
  volumes?: VolumeRow[] | null,
): Promise<Record<string, string>> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514', max_tokens: 1000,
      system: 'Naver SEO expert. Return raw JSON only, no markdown.',
      messages: [{ role: 'user', content: buildPrompt(productName, style, market, volumes) }],
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

/** Volume-signal telemetry returned to the caller — lets the verification
 *  step distinguish "SearchAd produced N rows and we reordered" from "no
 *  signal, AI order preserved". */
export interface VolumeSignal {
  available: boolean;
  preFetchRows: number;
  totalKnownRows: number;
  reorderedKeywords: boolean;
}

async function generateSEO(
  productName: string,
  style: SeoStyle = 'orthodox',
  market?: CompetitionAnalysis | null,
): Promise<{
  data: Record<string, string>;
  provider: string;
  market?: CompetitionAnalysis | null;
  volumeSignal: VolumeSignal;
}> {
  // ── Pre-AI SearchAd query ──────────────────────────────────────────────
  // Seed candidates from the product name (full + tokens). null result from
  // fetchKeywordVolumes means "no signal" — the AI prompt drops the section
  // and we skip the post-sort. This is the additive-fallback contract:
  // existing market signal still flows to the prompt regardless.
  const volumeMap = new Map<string, VolumeRow>();
  let volumesAvailable = false;
  let preFetchRows = 0;
  try {
    const candidates = extractCandidateKeywords(productName);
    if (candidates.length > 0) {
      const pre = await fetchKeywordVolumes(candidates);
      if (pre !== null) {
        volumesAvailable = true;
        preFetchRows = pre.length;
        for (const r of pre) volumeMap.set(normalizeKeyword(r.keyword), r);
      }
    }
  } catch (e) {
    console.warn(
      '[ai-generate] SearchAd pre-fetch failed:',
      e instanceof Error ? e.message : String(e),
    );
  }
  const preVolumeRows = [...volumeMap.values()];

  // ── AI call (Groq primary → Anthropic last-resort) ─────────────────────
  let aiData: Record<string, string> | null = null;
  let provider = '';

  const hasGroqKey = !!(
    process.env.GROQ_API_KEY ||
    process.env.GROQ_API_KEY_2 ||
    process.env.GROQ_API_KEY_3
  );
  if (hasGroqKey) {
    try {
      const text = await callGroq(
        buildPrompt(productName, style, market, preVolumeRows),
        'Output ONLY raw JSON. First char must be {, last must be }. No markdown.',
      );
      aiData = parseJsonSafe(text);
      provider = `groq-${GROQ_MODEL}`;
    } catch (e) {
      console.warn(
        '[ai-generate] All Groq keys failed, trying Anthropic:',
        e instanceof Error ? e.message.slice(0, 60) : e,
      );
    }
  }

  if (!aiData && process.env.ANTHROPIC_API_KEY) {
    aiData = await callAnthropic(productName, style, market, preVolumeRows);
    provider = 'claude-sonnet';
  }

  if (!aiData) {
    throw new Error(
      'AI 서비스 일시 응답 없음 (Groq + Anthropic 모두 실패). 잠시 후 다시 시도해주세요.',
    );
  }

  // ── Post-AI reorder by measured volume ─────────────────────────────────
  // For every keyword the AI produced that we have NOT yet measured, do a
  // top-up SearchAd query so the sort has data for it. AI keywords with no
  // measurement sink to the bottom of the list (preserved, not dropped) —
  // this respects the additive policy while still surfacing the real signal.
  let reorderedKeywords = false;
  if (volumesAvailable) {
    const rawCsv = aiData.naver_keywords ?? '';
    const aiKw = rawCsv
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);

    const unknown = aiKw.filter((k) => !volumeMap.has(normalizeKeyword(k)));
    if (unknown.length > 0) {
      try {
        const more = await fetchKeywordVolumes(unknown);
        if (more) {
          for (const r of more) {
            volumeMap.set(normalizeKeyword(r.keyword), r);
          }
        }
      } catch (e) {
        console.warn(
          '[ai-generate] SearchAd post-fetch failed:',
          e instanceof Error ? e.message : String(e),
        );
      }
    }

    if (aiKw.length > 0) {
      const annotated = aiKw.map((k) => {
        const row = volumeMap.get(normalizeKeyword(k));
        return { kw: k, vol: row ? row.totalMonthlyQc : null };
      });
      annotated.sort((a, b) => {
        // Measured-volume keywords first, descending; unmeasured keep
        // original relative order at the tail.
        if (a.vol !== null && b.vol !== null) return b.vol - a.vol;
        if (a.vol !== null) return -1;
        if (b.vol !== null) return 1;
        return 0;
      });
      const sortedCsv = annotated.map((x) => x.kw).join(', ');
      if (sortedCsv !== rawCsv) {
        aiData.naver_keywords = sortedCsv;
        reorderedKeywords = true;
      }
    }
  }

  return {
    data: aiData,
    provider,
    market,
    volumeSignal: {
      available: volumesAvailable,
      preFetchRows,
      totalKnownRows: volumeMap.size,
      reorderedKeywords,
    },
  };
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

    const { data: aiResponse, provider, volumeSignal } = await generateSEO(resolvedName, style as SeoStyle, market);

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
      volumeSignal,
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
