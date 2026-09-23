// src/lib/ai/image-engine.ts
//
// #47/#48/#49 Studio 2.0 (2026-09-23, 설계: docs/design/
// STUDIO_2_0_CHAT_IMAGE_GEN_2026-09-22.md) — 이미지 생성 "엔진 추상화"
// (제미나이 제안, 어댑터 패턴 — 프론트/호출부는 엔진이 바뀌어도 무수정).
//
// 확정된 사실(2026-09-23, 코드+공식문서 교차검증):
// - Gemini 이미지생성(gemini-2.5-flash-image)은 이 프로젝트 두 키(사업용/
//   개인용) 전부에서 실제로 402(Payment Required) 반환 — 무료 티어에서는
//   이미지생성 자체가 결제계정 연결(최소 $10 선불) 없이 작동 안 함(Vercel
//   런타임 로그 실측 확인, rev211/rev212).
// - Adobe Firefly Services API(서버가 자동 호출하는 방식)는 Adobe 공식
//   커뮤니티(community.adobe.com, 2024 확인 후 2026 재확인) 답변대로
//   "Enterprise 계약 고객 전용, 추가 비용" — 개인 Creative Cloud Premium
//   구독으로는 발급 불가. FIREFLY_SERVICES_CLIENT_ID/SECRET가 Vercel에
//   아예 없음(실측 확인) — 이 프로젝트는 현재 Firefly API 접근권이 없다.
// - Pollinations.ai(image.pollinations.ai)는 키/가입 없이 즉시 호출
//   가능한 무료 이미지 생성 API(공식 GitHub·PyPI 문서로 파라미터 확인,
//   2026). model=flux는 완전 무료·무제한(공식 pricing 문서 확인) — 이걸
//   기본 엔진으로 채택.
//
// 이 모듈은 위 3개 엔진을 하나의 함수 시그니처로 통일해 호출부(채팅 API,
// 향후 Fabric.js Canvas UI)가 IMAGE_ENGINE 값과 무관하게 동일하게
// 소비하도록 한다(#295 단일권위 — 엔진별 호출 로직은 각자 분리, 껍데기는
// 하나).

import { generateGeminiImage, type GeminiImageInput } from './gemini';

export type ImageEngineName = 'free' | 'gemini' | 'firefly';

export interface GeneratedImageResult {
  /** Base64-encoded image bytes (no data: URI prefix), or a direct URL for
   *  engines that don't return bytes inline (Pollinations returns bytes via
   *  fetch, so this is always populated for now). */
  base64Data: string;
  mimeType: string;
  engine: ImageEngineName;
}

export interface ImageEngineResponse {
  images: GeneratedImageResult[];
  /** True when the requested/preferred engine failed and a fallback engine
   *  produced the result instead — UI shows a toast when this is true
   *  (제미나이 제안, 대표님 확정: 자동전환 대신 선택+안내문구). */
  usedFallback: boolean;
  /** Human-readable reason shown in the fallback toast, only set when
   *  usedFallback is true. */
  fallbackReason?: string;
}

function currentEngine(): ImageEngineName {
  const v = process.env.IMAGE_ENGINE;
  if (v === 'gemini' || v === 'firefly') return v;
  return 'free'; // 기본값 — 결제 없이 항상 작동(#390: 코드는 항상 실측 가능한 안전한 기본값을 가진다)
}

/**
 * Pollinations.ai (image.pollinations.ai) — no key, no signup, model=flux
 * is fully free per official pricing docs. This is the safety-net engine:
 * every other engine falls back to this one on failure so the chat UI never
 * hard-fails on image generation.
 */
async function generateWithPollinations(
  prompt: string,
  opts: { width?: number; height?: number } = {},
): Promise<GeneratedImageResult> {
  const width = opts.width ?? 1024;
  const height = opts.height ?? 1024;
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}` +
    `?model=flux&width=${width}&height=${height}&nologo=true`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Pollinations image ${res.status}`);
  }
  const buf = await res.arrayBuffer();
  const base64Data = Buffer.from(buf).toString('base64');
  const mimeType = res.headers.get('content-type') || 'image/jpeg';
  return { base64Data, mimeType, engine: 'free' };
}

/** Adobe Firefly Services — currently unreachable (no server API key,
 *  Enterprise-only per Adobe). Throws immediately so the caller falls back;
 *  kept as a named function (not deleted) so wiring a future Enterprise key
 *  in is a one-line env var change, not a re-architecture (#295). */
async function generateWithFirefly(): Promise<GeneratedImageResult> {
  throw new Error('Firefly Services API key not configured (Enterprise-only, see image-engine.ts header)');
}

/**
 * Generate one image using the configured IMAGE_ENGINE, with automatic
 * fallback to the free Pollinations engine on any failure. Returns a flag
 * (usedFallback) so the UI can show the exact toast the design calls for:
 * "📢 ○○ 엔진을 사용할 수 없어 무료 엔진으로 전환되었습니다."
 */
export async function generateImage(
  prompt: string,
  opts: { width?: number; height?: number; referenceImages?: GeminiImageInput[] } = {},
): Promise<ImageEngineResponse> {
  const engine = currentEngine();

  if (engine === 'free') {
    const img = await generateWithPollinations(prompt, opts);
    return { images: [img], usedFallback: false };
  }

  if (engine === 'gemini') {
    try {
      const result = await generateGeminiImage(prompt, opts.referenceImages);
      if (result.images.length === 0) throw new Error('Gemini returned no images');
      return {
        images: result.images.map((i) => ({ ...i, engine: 'gemini' as const })),
        usedFallback: false,
      };
    } catch {
      const img = await generateWithPollinations(prompt, opts);
      return {
        images: [img],
        usedFallback: true,
        fallbackReason: 'Gemini 이미지 생성을 사용할 수 없어 무료 엔진으로 전환되었습니다.',
      };
    }
  }

  // engine === 'firefly'
  try {
    const img = await generateWithFirefly();
    return { images: [img], usedFallback: false };
  } catch {
    const img = await generateWithPollinations(prompt, opts);
    return {
      images: [img],
      usedFallback: true,
      fallbackReason: 'Adobe Firefly를 사용할 수 없어 무료 엔진으로 전환되었습니다.',
    };
  }
}
