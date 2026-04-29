// src/app/api/review-analysis/route.ts
// E-11: AI Review Sentiment Analysis endpoint
// POST: { reviews: string[], productName?: string } → SentimentResult
// Uses Groq → Gemini → Anthropic fallback (free tier)

import { NextRequest, NextResponse } from 'next/server';
import { analyzeReviewSentiment } from '@/lib/review-sentiment-analyzer';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Reasonable safety cap to prevent abuse / runaway prompts
const MAX_TOTAL_CHARS = 30000;
const MIN_REVIEWS = 1;
const MAX_REVIEWS = 50;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { reviews, productName } = body as {
      reviews?: unknown;
      productName?: unknown;
    };

    // Input validation
    if (!Array.isArray(reviews)) {
      return NextResponse.json(
        { success: false, error: '리뷰 배열이 필요합니다' },
        { status: 400 },
      );
    }

    const cleanReviews: string[] = reviews
      .map(r => String(r ?? '').trim())
      .filter(r => r.length > 0);

    if (cleanReviews.length < MIN_REVIEWS) {
      return NextResponse.json(
        { success: false, error: '리뷰가 비어있습니다. 1개 이상의 텍스트를 입력해주세요' },
        { status: 400 },
      );
    }

    if (cleanReviews.length > MAX_REVIEWS) {
      return NextResponse.json(
        { success: false, error: `리뷰는 최대 ${MAX_REVIEWS}개까지 분석 가능합니다 (입력: ${cleanReviews.length}개)` },
        { status: 400 },
      );
    }

    const totalChars = cleanReviews.reduce((sum, r) => sum + r.length, 0);
    if (totalChars > MAX_TOTAL_CHARS) {
      return NextResponse.json(
        { success: false, error: `리뷰 전체 길이가 너무 깁니다 (${totalChars}자, 최대 ${MAX_TOTAL_CHARS}자)` },
        { status: 400 },
      );
    }

    const productNameStr = typeof productName === 'string' && productName.trim().length > 0
      ? productName.trim().slice(0, 100)
      : undefined;

    // Run analysis
    const result = await analyzeReviewSentiment(cleanReviews, productNameStr);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : '알 수 없는 오류';
    console.error('[api/review-analysis POST]', msg);
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 },
    );
  }
}
