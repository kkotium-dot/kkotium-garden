// src/app/api/products/[id]/aeo-generate/route.ts
// C-2: AEO (Answer Engine Optimization) Q&A + FAQ auto-generator
// Generates structured Q&A pairs optimized for Naver AI Briefing
// AI provider (Sprint 7-PC-D 2026-05-19): Groq llama-3.3-70b-versatile (3 keys round-robin)
// Stores result in product.aeo_content JSONB column

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { callGroq, GROQ_MODEL } from '@/lib/ai/groq';

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

// ── AI provider call ─────────────────────────────────────────────────────────

async function callGroqAEO(prompt: string): Promise<AEOContent> {
  const text = await callGroq(
    prompt,
    'Output ONLY raw JSON. First char must be {, last must be }. No markdown.',
  );
  const parsed = parseJsonSafe(text);
  return {
    ...parsed,
    generatedAt: new Date().toISOString(),
    provider: `groq-${GROQ_MODEL}`,
  };
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

    // Groq (3 keys round-robin, free tier)
    let result: AEOContent;
    try {
      result = await callGroqAEO(prompt);
    } catch (e) {
      return NextResponse.json({
        success: false,
        error: 'AI 서비스 일시 응답 없음. 잠시 후 다시 시도해주세요.',
      }, { status: 503 });
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
