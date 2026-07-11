// src/lib/products/origin-kind.ts
// ============================================================================
// Product SOURCE tag for the unified management hub (authority docs/design/
// PRODUCT_MANAGEMENT_HUB_UNIFIED_SPEC_2026-07-10.md, 원칙 #245).
//
//   IMPORTED    — pulled from the store via 상품 연동 (revival candidates, #244)
//   APP_CREATED — created in-app via 씨앗심기 (new listings)
//   HYBRID      — an imported product later improved in-app (아틀리에 튜닝)
//
// deriveOriginKind reads the persisted `origin_kind` column when present, and
// otherwise DERIVES the tag from naverProductId (a store id ⇒ IMPORTED, else
// APP_CREATED). This keeps the hub correct in the pre-migration window (the
// column is added by Desktop via Supabase MCP; code deploys migration-first).
// HYBRID can only come from the persisted column — it is never derived.
//
// Labels are Korean and belong in the UI layer (i18n / inline), never here
// (rule 3-1) — this module returns the stable enum only.
// ============================================================================

export type OriginKind = 'IMPORTED' | 'APP_CREATED' | 'HYBRID';

const VALID: ReadonlySet<string> = new Set(['IMPORTED', 'APP_CREATED', 'HYBRID']);

export function deriveOriginKind(p: {
  origin_kind?: string | null;
  naverProductId?: string | null;
}): OriginKind {
  const raw = (p.origin_kind ?? '').toUpperCase();
  if (VALID.has(raw)) return raw as OriginKind;
  // Pre-migration fallback: infer from store-registration state.
  return p.naverProductId ? 'IMPORTED' : 'APP_CREATED';
}
