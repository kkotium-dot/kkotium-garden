// src/lib/engine/category-subject.ts
// ============================================================================
// English subject noun per Naver leaf category (#62 E2). The strategy engine
// used to pass `product.name` (the Korean SEO title) as the image-prompt subject
// noun, leaking Korean into the English prompt (the asciiPalette guard caught the
// palette but not the subject). This maps the canonical category code to a short
// English subject so the prompt stays clean English.
//
// Product-agnostic (#55): keyed by category, never by product id. Extensible —
// add a row per seeded category; an unseeded category degrades to the neutral
// 'product' (consistent with the engine's unseeded-DNA fallback). A future
// enhancement can LLM-normalize the subject from name/category at seed time.
// ============================================================================

const CATEGORY_SUBJECT: Record<string, string> = {
  '50014980': 'car air-vent fragrance diffuser', // 차량용방향제
  '50000963': 'decorative doorbell',             // 도어벨 (인테리어소품)
  '50005257': 'ice cube tray',                   // 얼음트레이 (주방용품)
};

const FALLBACK_SUBJECT = 'product';

/** English subject noun for a Naver leaf category code, or the neutral fallback. */
export function englishSubjectFor(categoryCode: string | null | undefined): string {
  return CATEGORY_SUBJECT[(categoryCode ?? '').trim()] ?? FALLBACK_SUBJECT;
}
