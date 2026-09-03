// POST /api/ai/image-ocr — Gemini 멀티모달 OCR 속성추출
// (docs/design/GEMINI_OCR_INTERVENTION_2026-09-03.md)
//
// 도매 상세이미지(또는 씨앗심기에 업로드된 이미지) 1장을 Gemini Vision에
// 넘겨 재질/크기/용량/원산지/특징/키워드를 "후보"로 추출한다. Gemini
// 전용(멀티모달) — Groq는 텍스트 전용이라 폴백 대상이 아니다(#353/#295:
// 자동확정 없음, 신규 판정엔진 아님).

import { NextRequest, NextResponse } from 'next/server';
import { hasGeminiKey } from '@/lib/ai/gemini';
import { extractAttributesFromImage } from '@/lib/ai/gemini-ocr';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const imageUrl: string | undefined = body?.imageUrl;

    if (!imageUrl?.trim()) {
      return NextResponse.json({ success: false, error: '이미지 URL이 필요합니다.' }, { status: 400 });
    }

    if (!hasGeminiKey()) {
      return NextResponse.json(
        { success: false, error: 'GEMINI_API_KEY 미설정. .env.local에 추가해주세요 (무료).' },
        { status: 500 }
      );
    }

    const attributes = await extractAttributesFromImage(imageUrl.trim());
    return NextResponse.json({ success: true, attributes });
  } catch (e: unknown) {
    // 이미지에서 못 읽었다는 사실만 정직하게 전달 — 키값·원본 응답은 절대 노출 안 함(#156/#310).
    const msg = e instanceof Error ? e.message : String(e);
    console.warn('[image-ocr] failed:', msg.slice(0, 80));
    return NextResponse.json(
      { success: false, error: '이미지에서 정보를 못 읽었어요. 직접 입력해주세요.' },
      { status: 200 }
    );
  }
}
