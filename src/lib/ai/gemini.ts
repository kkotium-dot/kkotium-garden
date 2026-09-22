// src/lib/ai/gemini.ts
// ============================================================================
// GEMINI-RESTORE (#155 / #156) — env-based Google Gemini Flash (free tier),
// the FREE fallback between Groq (free) and Anthropic (paid, last resort). Keys
// come ONLY from the environment (GEMINI_API_KEY / _2 / _3, round-robin on
// quota) — NEVER hardcoded, and never logged (not even a fragment), per #156.
// Returns the raw model text (JSON string), matching the callGroq / callAnthropic
// contract so callers keep a single normalize() path.
//
// NOTE: lives at src/lib/ai/gemini.ts (provider convention, next to groq.ts).
// The legacy src/lib/gemini.ts is an unrelated Groq-compat shim and is left
// untouched.

// gemini-2.0-flash shut down 2026-06-01; gemini-3.6-flash is Google's
// designated replacement (ai.google.dev/gemini-api/docs/deprecations).
export const GEMINI_MODEL = 'gemini-3.6-flash';

// #47/#48/#49/Studio-2.0 (2026-09-22, 설계: docs/design/
// STUDIO_2_0_CHAT_IMAGE_GEN_2026-09-22.md) — 이미지 생성 함수가 동일한
// 2키 라운드로빈을 재사용해야 하므로 export(#295 단일권위, 키 순환 로직
// 중복 금지).
export function geminiKeys(): string[] {
  return [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
  ].filter(Boolean) as string[];
}

/** True when at least one Gemini key is configured. */
export function hasGeminiKey(): boolean {
  return geminiKeys().length > 0;
}

/** Inline image payload for multimodal (vision/OCR) calls — never a URL, always
 * pre-fetched + resized by the caller (GEMINI_OCR_INTERVENTION_2026-09-03.md
 * §2: base64 inline_data, not file_uri — avoids wholesale-URL expiry/CORS). */
export interface GeminiImageInput {
  mimeType: string; // e.g. 'image/jpeg'
  base64Data: string; // raw base64, no 'data:' prefix
}

// MULTI_IMAGE_OCR_FIX_2026-09-16 (원본메모: "이미지에서 정보읽기가 상세
// 페이지에서 올린 첫 이미지 한 장의 정보만 읽는 것 같음") — 실측 확정:
// extractAttributesFromImage가 애초에 imageUrl 1개(string)만 받는 설계
//였다(주석에 명시: "1장을 Gemini Vision에 넘겨"). 상세페이지는 보통
// 여러 장(재질표/사이즈표/원산지 각각 다른 이미지)이라 1장만 읽으면
// 나머지 이미지의 스펙 정보를 놓친다. Gemini generateContent API의 parts
// 배열은 원래 여러 inline_data를 동시에 담을 수 있는 표준 구조(멀티모달)
// 이므로, 이를 활용해 단일→배열로 확장한다(하위호환: images 배열 길이1도
// 그대로 동작).
async function callGeminiWithKey(
  prompt: string,
  systemPrompt: string,
  apiKey: string,
  images?: GeminiImageInput[],
): Promise<string> {
  // The key travels only in the request URL to Google — never logged/returned.
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
  const parts: Record<string, unknown>[] = [{ text: prompt }];
  for (const image of images ?? []) {
    parts.push({ inline_data: { mime_type: image.mimeType, data: image.base64Data } });
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ parts }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 2500,
        responseMimeType: 'application/json',
      },
    }),
  });
  if (!res.ok) {
    // Status only — never echo the response body (#156).
    throw new Error(`Gemini ${res.status}`);
  }
  const data = await res.json();
  const responseParts: { text?: string; thought?: boolean }[] = data.candidates?.[0]?.content?.parts ?? [];
  return responseParts.filter((p) => !p.thought).map((p) => p.text ?? '').join('').trim();
}

async function callGeminiRoundRobin(
  prompt: string,
  systemPrompt: string,
  images: GeminiImageInput[] | undefined,
  logTag: string,
): Promise<string> {
  const keys = geminiKeys();
  if (keys.length === 0) throw new Error('GEMINI_API_KEY not set');

  let lastErr = '';
  for (let i = 0; i < keys.length; i++) {
    try {
      return await callGeminiWithKey(prompt, systemPrompt, keys[i], images);
    } catch (e) {
      lastErr = e instanceof Error ? e.message : String(e);
      if (lastErr.includes('429') || lastErr.includes('quota') || lastErr.includes('403')) {
        console.warn(`[${logTag}] key #${i + 1} quota/limit, trying next`); // index only — no key value
        continue;
      }
      throw e;
    }
  }
  throw new Error(`Gemini all keys failed: ${lastErr}`);
}

/**
 * Call Gemini Flash (text-only) with key round-robin. Throws if no key is set
 * or all keys fail (caller falls through to the next provider). No key value
 * ever appears in errors or logs (#156).
 */
export async function callGemini(prompt: string, systemPrompt: string): Promise<string> {
  return callGeminiRoundRobin(prompt, systemPrompt, undefined, 'gemini');
}

/**
 * Call Gemini Flash with one or more inline images (multimodal OCR/vision) —
 * same key round-robin and error contract as callGemini. Per design
 * (GEMINI_OCR_INTERVENTION_2026-09-03.md), this is Gemini-only: no Groq text
 * fallback, since Groq cannot read images. Caller must pre-fetch and resize
 * each image (recommended: ≤1456px, web-JPEG) before base64-encoding it.
 * MULTI_IMAGE_OCR_FIX_2026-09-16 — accepts a single image OR an array so a
 * detail page's multiple images (spec table, material tag, size chart, each
 * possibly a different photo) can all be read in one Gemini call instead of
 * only the first.
 */
export async function callGeminiVision(
  prompt: string,
  systemPrompt: string,
  images: GeminiImageInput | GeminiImageInput[],
): Promise<string> {
  const arr = Array.isArray(images) ? images : [images];
  return callGeminiRoundRobin(prompt, systemPrompt, arr, 'gemini-vision');
}

// ---------------------------------------------------------------------------
// Image generation ("Nano Banana") — Studio 2.0 인앱 채팅 이미지 생성
// (2026-09-22, 설계: docs/design/STUDIO_2_0_CHAT_IMAGE_GEN_2026-09-22.md).
//
// 별도 엔드포인트가 아니라 동일한 generateContent에 이미지 생성 모델명과
// responseModalities:['TEXT','IMAGE']만 다르게 호출(공식문서 ai.google.dev/
// gemini-api/docs/generate-content/image-generation, Firebase AI Logic 문서
// 교차검증, 2026-09-22 확인). callGeminiWithKey는 텍스트만 반환하도록 고정돼
// 있어(#156 — 원인 상세 비노출 계약) 재사용하지 않고, 이미지 생성 전용
// 응답 shape(inlineData 포함)에 맞춘 별도 경로를 둔다 — 키 순환(geminiKeys)
// 은 그대로 공유(#295 단일권위).
// ---------------------------------------------------------------------------

// gemini-2.5-flash-image ("Nano Banana") — 2026-09-22 실측+공식문서 교차검증
// 기준 채택. 최초엔 'gemini-3.1-flash-image'로 구현했으나 배포 후 실제
// 호출이 두 키 모두에서 실패(Vercel 런타임 로그로 확인) — 원인 추적 결과
// ①정확한 모델명은 'gemini-3.1-flash-image-preview'(-preview 접미사
// 필수, getmaxim.ai 모델표 확인)였고 ②그 preview 모델조차 Google 개발자
// 포럼(discuss.ai.google.dev, 2026)에 "batch API에서 무한 대기, 2.5-flash
// -image로 바꾸면 정상 작동"이라는 실증 보고가 있어 안정성이 낮음. 구버전
// gemini-2.5-flash-image는 2027-03-15까지 지원 확정(Google Cloud 공식
// deprecation 표기)이라 이걸 채택 — 텍스트 전용 GEMINI_MODEL과 별개
// 상수로 분리(두 모델은 서로 다른 deprecation 주기를 가질 수 있음).
export const GEMINI_IMAGE_MODEL = 'gemini-2.5-flash-image';

export interface GeneratedImage {
  /** Base64-encoded image bytes (no data: URI prefix). */
  base64Data: string;
  mimeType: string;
}

export interface GeminiImageGenerationResult {
  /** Any accompanying text the model produced alongside the image(s). */
  text: string;
  images: GeneratedImage[];
}

async function callGeminiImageWithKey(
  prompt: string,
  apiKey: string,
  referenceImages?: GeminiImageInput[],
): Promise<GeminiImageGenerationResult> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_IMAGE_MODEL}:generateContent?key=${apiKey}`;
  const parts: Record<string, unknown>[] = [{ text: prompt }];
  // 멀티턴 이미지 편집("이 배경을 대리석으로 바꿔줘") — 이전에 생성/제공된
  // 이미지를 참조 입력으로 함께 보낸다(Studio 2.0 채팅 UI가 대화 히스토리의
  // 최근 이미지를 여기로 전달).
  for (const image of referenceImages ?? []) {
    parts.push({ inline_data: { mime_type: image.mimeType, data: image.base64Data } });
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    }),
  });
  if (!res.ok) {
    // Status only — never echo the response body (#156).
    throw new Error(`Gemini image ${res.status}`);
  }
  const data = await res.json();
  const responseParts: { text?: string; inlineData?: { data?: string; mimeType?: string } }[] =
    data.candidates?.[0]?.content?.parts ?? [];

  const text = responseParts.filter((p) => p.text).map((p) => p.text).join('').trim();
  const images: GeneratedImage[] = responseParts
    .filter((p) => p.inlineData?.data)
    .map((p) => ({
      base64Data: p.inlineData!.data!,
      mimeType: p.inlineData!.mimeType ?? 'image/png',
    }));

  return { text, images };
}

/**
 * Generate (or edit, via referenceImages) one or more images with Gemini,
 * rotating across the configured GEMINI_API_KEY(_2/_3) on 429/quota/403 —
 * same failover contract as callGeminiRoundRobin.
 */
export async function generateGeminiImage(
  prompt: string,
  referenceImages?: GeminiImageInput[],
): Promise<GeminiImageGenerationResult> {
  const keys = geminiKeys();
  if (keys.length === 0) throw new Error('GEMINI_API_KEY not set');

  let lastErr = '';
  for (let i = 0; i < keys.length; i++) {
    try {
      return await callGeminiImageWithKey(prompt, keys[i], referenceImages);
    } catch (e) {
      lastErr = e instanceof Error ? e.message : String(e);
      if (lastErr.includes('429') || lastErr.includes('quota') || lastErr.includes('403')) {
        // GEMINI_IMAGE_429_DIAGNOSIS_2026-09-22 — 정확한 HTTP 상태코드를
        // 로그에 남긴다(이전엔 "quota/limit"으로만 뭉뚱그려 429(일시적
        // 한도초과, 재시도로 해결가능)와 403(권한자체 없음, 재시도해도
        // 무의미)을 구분할 수 없었음 — 제미나이가 "429 RPM/TPM 문제"라고
        // 진단했는데, 실제로 403인지 429인지 이 로그로 확정한다).
        console.warn(`[gemini-image] key #${i + 1} failed (${lastErr}), trying next`); // status only — no key value
        continue;
      }
      throw e;
    }
  }
  throw new Error(`Gemini image generation failed on all keys: ${lastErr}`);
}
