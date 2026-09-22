// src/app/api/ai/generate-image/route.ts
// ============================================================================
// STUDIO_2_0_IMAGE_GEN_2026-09-22 (#47/#48/#49) — 1-B 최소 검증 엔드포인트.
// 이미지를 생성해 base64 data URI로 반환한다. 저장/영속화는 하지 않음
// (씨앗심기 upload API와의 연결은 채팅 UI(1-A) 구현 단계에서 처리).
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { generateGeminiImage, hasGeminiKey } from '@/lib/ai/gemini';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  if (!hasGeminiKey()) {
    return NextResponse.json({ success: false, error: 'Gemini API 키가 설정되지 않았습니다.' }, { status: 503 });
  }

  try {
    const body = await request.json();
    const prompt: string = typeof body?.prompt === 'string' ? body.prompt.trim() : '';
    if (!prompt) {
      return NextResponse.json({ success: false, error: '프롬프트가 필요합니다.' }, { status: 400 });
    }

    const result = await generateGeminiImage(prompt);

    return NextResponse.json({
      success: true,
      text: result.text,
      images: result.images.map((img) => `data:${img.mimeType};base64,${img.base64Data}`),
      imageCount: result.images.length,
    });
  } catch (e: unknown) {
    // 원인 상세는 노출하지 않는다(#156/#310).
    return NextResponse.json({ success: false, error: '이미지 생성 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
