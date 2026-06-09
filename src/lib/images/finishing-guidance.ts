// src/lib/images/finishing-guidance.ts
//
// Shared source-selection guidance for the representative-image finishing tools
// (C-2 apply-cutout, C-7 apply-composite). Authority: workrule #57 — the cutout /
// composite source must be a real-photographed hero shot (a large, sharp product
// photo from the supplier detail page), never a small variant card, a text-mixed
// cut, or a low-resolution thumbnail.
//
// Machine-readable only; the Korean label lives in
// src/lib/i18n/finishing-labels.ko.json (key = labelKey) and is rendered by the
// UI (CLAUDE.md §3-1).

export const REAL_HERO_CUT_GUIDANCE = {
  prefer: 'real_hero_cut',
  principle: '#57',
  labelKey: 'preferRealHeroCut',
} as const;

/** Map an operator-driven finishing job_type to the app route that recovers its
 *  result (e.g. an Adobe cutout / Firefly composite) and applies it. */
export function recoverRouteFor(productId: string, jobType: string): string | null {
  switch (jobType) {
    case 'bg_clean':
      return `/api/products/${productId}/apply-cutout`;
    case 'product_composite':
      return `/api/products/${productId}/apply-composite`;
    default:
      return null;
  }
}
