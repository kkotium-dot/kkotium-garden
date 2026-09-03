// src/lib/ai/gemini-ocr.ts
// ============================================================================
// GEMINI-OCR (docs/design/GEMINI_OCR_INTERVENTION_2026-09-03.md) — 도매
// 상세이미지에서 재질/크기/용량/원산지 등 속성을 Gemini 멀티모달 OCR로
// 추출한다. Groq(텍스트 전용)로는 불가능한 Gemini 고유 개입점.
//
// 이 모듈은 "후보"만 만든다 — 결과는 항상 사람이 "적용"을 눌러야 폼에
// 반영된다(#353 반자동 원칙). 신규 판정엔진이 아니라 기존 UCE/SEO 입력을
// 보강하는 힌트일 뿐(#295 단일권위 유지). 실패 시 Groq 텍스트 폴백 없음 —
// OCR은 Gemini 전용이고, 실패하면 사람이 직접 입력한다.
// ============================================================================

import sharp from 'sharp';
import { callGeminiVision, hasGeminiKey, type GeminiImageInput } from './gemini';

export interface ExtractedAttributes {
  material?: string;
  size?: string;
  capacity?: string;
  origin?: string;
  features: string[];
  keywords: string[];
}

const EMPTY_ATTRIBUTES: ExtractedAttributes = { features: [], keywords: [] };

// Design §2/§4: resize to ≤1456px (longest side), web-JPEG — keeps Vercel's
// 4.5MB body limit and Gemini token usage in check. Never upscale.
const MAX_DIMENSION = 1456;
const JPEG_QUALITY = 80;

/** Fetch a (possibly wholesale-supplier) image URL and resize it into a
 * Gemini inline_data payload. Base64 avoids URL expiry/CORS issues that a
 * file_uri would inherit from the source (design §2). */
export async function fetchImageForGemini(imageUrl: string): Promise<GeminiImageInput> {
  const res = await fetch(imageUrl);
  if (!res.ok) throw new Error(`image fetch ${res.status}`);
  const arrayBuf = await res.arrayBuffer();
  const jpegBuf = await sharp(Buffer.from(arrayBuf))
    .resize(MAX_DIMENSION, MAX_DIMENSION, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: JPEG_QUALITY })
    .toBuffer();
  return { mimeType: 'image/jpeg', base64Data: jpegBuf.toString('base64') };
}

function parseJsonSafe(text: string): unknown {
  let t = text.trim().replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '').trim();
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start !== -1 && end !== -1) t = t.slice(start, end + 1);
  try {
    return JSON.parse(t);
  } catch {
    const cleaned = t
      .replace(/,(\s*[}\]])/g, '$1')
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .replace(/[\x00-\x1F\x7F]/g, '');
    return JSON.parse(cleaned);
  }
}

function normalizeAttributes(raw: unknown): ExtractedAttributes {
  if (!raw || typeof raw !== 'object') return EMPTY_ATTRIBUTES;
  const r = raw as Record<string, unknown>;
  const str = (v: unknown): string | undefined =>
    typeof v === 'string' && v.trim() && v.trim().toLowerCase() !== 'unknown' ? v.trim().slice(0, 100) : undefined;
  const strArr = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && !!x.trim()).map((x) => x.trim().slice(0, 40)).slice(0, 10) : [];
  return {
    material: str(r.material),
    size: str(r.size),
    capacity: str(r.capacity),
    origin: str(r.origin),
    features: strArr(r.features),
    keywords: strArr(r.keywords),
  };
}

const SYSTEM_PROMPT =
  '당신은 이커머스 상세이미지 OCR 전문가입니다. 이미지 속 텍스트(재질/크기/용량/원산지/스펙표 등)를 읽어 ' +
  '속성을 JSON으로만 출력하세요. 첫 글자는 { 마지막 글자는 } 여야 하고, 설명·마크다운은 절대 포함하지 마세요. ' +
  '이미지에서 읽을 수 없는 필드는 생략하세요(추측 금지 — 확신 없으면 빈 값).';

const USER_PROMPT =
  '이 상품 상세이미지에서 다음 JSON 스키마로 속성을 추출하세요:\n' +
  '{"material": "재질(예: 스테인리스, 원목)", "size": "크기/사이즈", "capacity": "용량", ' +
  '"origin": "원산지 텍스트(이미지에 표기된 그대로, 예: 중국/China/원산지:국산)", ' +
  '"features": ["이미지에서 읽은 주요 스펙/특징 텍스트, 최대 6개"], ' +
  '"keywords": ["상품 검색에 쓸만한 키워드, 최대 8개"]}\n' +
  '이미지에 없는 필드는 키 자체를 생략하세요.';

/**
 * Extract candidate attributes from a single detail image. Always returns a
 * (possibly partial) ExtractedAttributes — never throws for "nothing found",
 * only for real failures (no key / fetch / API error) so the caller can show
 * "이미지에서 정보를 못 읽었어요, 직접 입력" (design §3-3 / #310 정직표시).
 */
export async function extractAttributesFromImage(imageUrl: string): Promise<ExtractedAttributes> {
  if (!hasGeminiKey()) throw new Error('GEMINI_API_KEY not set');
  const image = await fetchImageForGemini(imageUrl);
  const raw = await callGeminiVision(USER_PROMPT, SYSTEM_PROMPT, image);
  return normalizeAttributes(parseJsonSafe(raw));
}
