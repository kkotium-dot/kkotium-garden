// src/app/api/products/[id]/aeo-generate/route.ts
// C-2: AEO (Answer Engine Optimization) Q&A + FAQ auto-generator
// Generates structured Q&A pairs optimized for Naver AI Briefing
// Uses Gemini round-robin > Groq fallback > static fallback
// Stores result in product.aeo_content JSONB column

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// ── Types ────────────────────────────────────────────────────────────────────

interface QAPair {
  q: string;
  a: string;
}

interface AEOContent {
  qna: QAPair[];
  faq: QAPair[];
  generatedAt: string;
  provider: string;
}

// ── Prompt builder ───────────────────────────────────────────────────────────

function buildAEOPrompt(product: {
  name: string;
  description?: string | null;
  category?: string | null;
  brand?: string | null;
  naver_material?: string | null;
  naver_size?: string | null;
  naver_origin?: string | null;
  salePrice?: number | null;
  naver_keywords?: string | null;
}): string {
  const ctx = [
    `Product: ${product.name}`,
    product.category ? `Category: ${product.category}` : '',
    product.brand ? `Brand: ${product.brand}` : '',
    product.description ? `Description: ${product.description.slice(0, 200)}` : '',
    product.naver_material ? `Material: ${product.naver_material}` : '',
    product.naver_size ? `Size: ${product.naver_size}` : '',
    product.naver_origin ? `Origin: ${product.naver_origin}` : '',
    product.salePrice ? `Price: ${product.salePrice.toLocaleString()} KRW` : '',
    product.naver_keywords ? `Keywords: ${product.naver_keywords}` : '',
  ].filter(Boolean).join('\n');

  return `You are a Naver Smart Store product detail page copywriter specializing in AEO (Answer Engine Optimization) for Naver AI Briefing and AI Shopping Guide.

${ctx}

Generate structured content optimized for Naver AI to cite in AI Briefing answers.
Respond ONLY with raw JSON (no markdown, first char must be {):

{
  "qna": [
    {"q": "question about the product in Korean", "a": "detailed answer in Korean (2-3 sentences)"},
    ... (generate 5-8 Q&A pairs)
  ],
  "faq": [
    {"q": "common purchase FAQ in Korean", "a": "clear answer in Korean (1-2 sentences)"},
    ... (generate 3-5 FAQ items)
  ]
}

Rules for Q&A (product-specific, AEO optimized):
- Questions should match real customer search queries on Naver
- Include questions about: material/quality, size/fit, use cases, comparison with alternatives, maintenance/care
- Answers must be factual, specific, and include product attributes
- Use H2-level question format: "OOO(product) + specific attribute question"
- Each answer 50-100 chars, conversational Korean tone

Rules for FAQ (common purchase questions):
- Shipping/delivery timeline
- Return/exchange policy  
- Gift wrapping availability
- Size guide or measurement
- Care instructions
- Include concrete numbers (days, amounts) where possible`;
}

// ── AI provider calls ────────────────────────────────────────────────────────

async function callGeminiAEO(prompt: string): Promise<AEOContent> {
  const keys = [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
  ].filter(Boolean) as string[];

  if (keys.length === 0) throw new Error('GEMINI_NOT_CONFIGURED');

  let lastErr = '';
  for (const key of keys) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: 'Output ONLY raw JSON. First char must be {, last must be }. No markdown.' }] },
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.4, maxOutputTokens: 2048, responseMimeType: 'application/json' },
        }),
      });
      if (!res.ok) throw new Error(`Gemini ${res.status}`);
      const data = await res.json();
      const parts: { text?: string; thought?: boolean }[] = data.candidates?.[0]?.content?.parts ?? [];
      const text = parts.filter(p => !p.thought).map(p => p.text ?? '').join('').trim();
      const parsed = parseJsonSafe(text);
      return { ...parsed, generatedAt: new Date().toISOString(), provider: 'gemini-2.0-flash' };
    } catch (e) {
      lastErr = e instanceof Error ? e.message : String(e);
      if (lastErr.includes('429') || lastErr.includes('quota') || lastErr.includes('403')) continue;
      throw e;
    }
  }
  throw new Error(`Gemini all keys failed: ${lastErr}`);
}

async function callGroqAEO(prompt: string): Promise<AEOContent> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_NOT_CONFIGURED');

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: 'Output ONLY raw JSON. First char must be {, last must be }. No markdown.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.4,
      max_tokens: 2048,
    }),
  });
  if (!res.ok) throw new Error(`Groq ${res.status}`);
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content ?? '';
  const parsed = parseJsonSafe(text);
  return { ...parsed, generatedAt: new Date().toISOString(), provider: 'groq-llama3' };
}

function parseJsonSafe(text: string): { qna: QAPair[]; faq: QAPair[] } {
  let t = text.trim().replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '').trim();
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start !== -1 && end !== -1) t = t.slice(start, end + 1);
  const parsed = JSON.parse(t);
  // Validate structure
  if (!Array.isArray(parsed.qna)) parsed.qna = [];
  if (!Array.isArray(parsed.faq)) parsed.faq = [];
  return { qna: parsed.qna, faq: parsed.faq };
}

// ── POST handler ─────────────────────────────────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const product = await prisma.product.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
        category: true,
        brand: true,
        naver_material: true,
        naver_size: true,
        naver_origin: true,
        salePrice: true,
        naver_keywords: true,
      },
    });

    if (!product) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
    }

    const prompt = buildAEOPrompt(product);

    // Try Gemini first, then Groq
    let result: AEOContent;
    try {
      result = await callGeminiAEO(prompt);
    } catch {
      try {
        result = await callGroqAEO(prompt);
      } catch (e2) {
        return NextResponse.json({
          success: false,
          error: e2 instanceof Error ? e2.message : 'All AI providers failed',
        }, { status: 503 });
      }
    }

    // Save to DB
    await prisma.product.update({
      where: { id },
      data: {
        aeo_content: result as any,
        aeo_generated_at: new Date(),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      provider: result.provider,
      qnaCount: result.qna.length,
      faqCount: result.faq.length,
      data: result,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[aeo-generate]', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// ── GET handler (retrieve existing AEO content) ──────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const product = await prisma.product.findUnique({
      where: { id },
      select: { aeo_content: true, aeo_generated_at: true },
    });

    if (!product) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      hasContent: !!product.aeo_content,
      data: product.aeo_content,
      generatedAt: product.aeo_generated_at,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
