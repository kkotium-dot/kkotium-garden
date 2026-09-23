// src/app/api/ai/generate-image/route.ts
// ============================================================================
// STUDIO_2_0_IMAGE_GEN_2026-09-23 (#47/#48/#49) — 이미지 생성 엔드포인트.
// image-engine.ts의 어댑터(IMAGE_ENGINE 환경변수로 free/gemini/firefly
// 스위칭, 실패 시 자동으로 무료 엔진 폴백)를 그대로 통과시킨다 — 이
// route 자체는 어느 엔진이 쓰이는지 몰라도 되는 얇은 계층(#295 단일권위).
// 저장/영속화는 하지 않음(씨앗심기 upload API와의 연결은 채팅 UI(1-A)
// 구현 단계에서 처리).
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { generateImage } from '@/lib/ai/image-engine';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const prompt: string = typeof body?.prompt === 'string' ? body.prompt.trim() : '';
    if (!prompt) {
      return NextResponse.json({ success: false, error: '프롬프트가 필요합니다.' }, { status: 400 });
    }
    const width = typeof body?.width === 'number' ? body.width : undefined;
    const height = typeof body?.height === 'number' ? body.height : undefined;

    const result = await generateImage(prompt, { width, height });

    return NextResponse.json({
      success: true,
      images: result.images.map((img) => `data:${img.mimeType};base64,${img.base64Data}`),
      imageCount: result.images.length,
      engine: result.images[0]?.engine,
      usedFallback: result.usedFallback,
      fallbackReason: result.fallbackReason,
    });
  } catch (e: unknown) {
    // 서버 로그에는 정확한 원인을 남기고, 사용자 응답에는 원인 상세를
    // 노출하지 않는다(#156/#310) — 서로 다른 청중이라 충돌하지 않는다.
    console.error('[generate-image]', e instanceof Error ? e.message : String(e));
    return NextResponse.json({ success: false, error: '이미지 생성 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
