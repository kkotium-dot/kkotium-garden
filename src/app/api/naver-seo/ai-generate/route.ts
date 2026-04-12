// src/app/api/naver-seo/ai-generate/route.ts
// AI SEO generator — 3 style modes: orthodox / emotional / niche
// Provider priority: Gemini (free) > Anthropic > Perplexity

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// ─── Style mode type ──────────────────────────────────────────────────────────

export const dynamic = 'force-dynamic';
type SeoStyle = 'orthodox' | 'emotional' | 'niche';

// ─── Prompt builders ──────────────────────────────────────────────────────────

function buildPrompt(productName: string, style: SeoStyle): string {
  const base = `Product name: ${productName}
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

// Single key call
async function callGeminiWithKey(productName: string, style: SeoStyle, apiKey: string): Promise<Record<string, string>> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: 'Output ONLY raw JSON. First char must be {, last must be }. No markdown.' }] },
      contents: [{ parts: [{ text: buildPrompt(productName, style) }] }],
      generationConfig: { temperature: style === 'emotional' ? 0.7 : 0.2, maxOutputTokens: 2048, responseMimeType: 'application/json' },
    }),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  const data = await res.json();
  const parts: { text?: string; thought?: boolean }[] = data.candidates?.[0]?.content?.parts ?? [];
  const text = parts.filter(p => !p.thought).map(p => p.text ?? '').join('').trim();
  return parseJsonSafe(text);
}

// Round-robin across all available Gemini keys
async function callGemini(productName: string, style: SeoStyle): Promise<Record<string, string>> {
  const keys = [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
  ].filter(Boolean) as string[];
  if (keys.length === 0) throw new Error('GEMINI_API_KEY not set');
  let lastErr = '';
  for (const key of keys) {
    try {
      return await callGeminiWithKey(productName, style, key);
    } catch (e) {
      lastErr = e instanceof Error ? e.message : String(e);
      if (lastErr.includes('429') || lastErr.includes('quota') || lastErr.includes('403')) {
        console.warn(`[ai-generate] Gemini key ${key.slice(-6)} quota/403, trying next`);
        continue;
      }
      throw e;
    }
  }
  throw new Error(`Gemini: 모든 키 quota 초과 (${lastErr.slice(0,60)})`);
}

async function callAnthropic(productName: string, style: SeoStyle): Promise<Record<string, string>> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514', max_tokens: 1000,
      system: '네이버 SEO 전문가. 순수 JSON만 반환. 마크다운 금지.',
      messages: [{ role: 'user', content: buildPrompt(productName, style) }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}`);
  const data = await res.json();
  return parseJsonSafe(data.content?.[0]?.text ?? '');
}

async function callPerplexity(productName: string, style: SeoStyle): Promise<Record<string, string>> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) throw new Error('PERPLEXITY_API_KEY not set');
  const res = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'sonar-pro',
      messages: [
        { role: 'system', content: '네이버 SEO 전문가. 순수 JSON만 반환.' },
        { role: 'user', content: buildPrompt(productName, style) },
      ],
      temperature: 0.2, max_tokens: 1000,
    }),
  });
  if (!res.ok) throw new Error(`Perplexity ${res.status}`);
  const data = await res.json();
  return parseJsonSafe(data.choices?.[0]?.message?.content ?? '');
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
  style: SeoStyle = 'orthodox'
): Promise<{ data: Record<string, string>; provider: string }> {
  // Try Gemini first (free tier, up to 3 keys), fall through on all quota failures
  const hasGeminiKey = !!(process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY_2 || process.env.GEMINI_API_KEY_3);
  if (hasGeminiKey) {
    try { return { data: await callGemini(productName, style), provider: 'gemini-2.0-flash' }; }
    catch (e) { console.warn('[ai-generate] All Gemini keys failed, trying Anthropic:', e instanceof Error ? e.message.slice(0,60) : e); }
  }
  // Anthropic fallback
  if (process.env.ANTHROPIC_API_KEY) {
    try { return { data: await callAnthropic(productName, style), provider: 'claude-sonnet' }; }
    catch (e) { console.warn('[ai-generate] Anthropic failed, trying Perplexity:', e instanceof Error ? e.message.slice(0,60) : e); }
  }
  // Perplexity last resort
  if (process.env.PERPLEXITY_API_KEY) {
    return { data: await callPerplexity(productName, style), provider: 'perplexity-sonar' };
  }
  throw new Error('AI API 키가 없습니다. GEMINI_API_KEY를 .env.local에 추가하세요 (무료).');
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

    const { data: aiResponse, provider } = await generateSEO(resolvedName, style as SeoStyle);

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

    return NextResponse.json({ success: true, provider, style, data: aiResponse });
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
