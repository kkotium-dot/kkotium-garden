// /products/[id]/edit — B5 재설계 패리티 (2026-06-23).
// ============================================================================
// The legacy emoji-tab <ProductForm> (📦 기본 / 🖼️ 이미지 / 📈 SEO, no 옵션·
// no 배송 tabs) is retired. Editing now reuses the SAME premium seed-planting
// form as /products/new via its built-in edit mode (?edit=ID), so there is ONE
// shared editor for create + edit (#135) with full parity:
//   - Lucide tabs (기본/옵션/이미지/배송·A/S/SEO·원산지/혜택) — no emoji.
//   - 임시저장 / DB 저장 / 저장 후 온실 아틀리에 action bar (idempotent PUT on edit).
//   - 상세페이지 production removed from the 이미지 tab (lives in Studio, #131).
//
// Server-side redirect keeps the URL canonical and avoids a flash of the old UI.
// Data-safe: the new form's edit-mode save omits option fields when none are
// loaded (buildOptionsPayload -> null -> partial PUT), so existing
// product_options are never wiped. (Option prefill-on-edit is a tracked GAP.)

import { redirect } from 'next/navigation';

export default function EditProductPage({ params }: { params: { id: string } }) {
  redirect(`/products/new?edit=${encodeURIComponent(params.id)}`);
}
