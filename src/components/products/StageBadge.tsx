// src/components/products/StageBadge.tsx
// ============================================================================
// SEED-SAVE C-3 Step 5 (#62/#179) — the single lifecycle-stage badge shared by
// 대시보드 · 꿀통(crawl) · 창고(products). One derivation, one set of labels/colors,
// so an item shows the SAME stage everywhere.
//
// ★ #179 — sourcing_status is legacy-polluted and must NOT be trusted when a
// Product link exists. The derivation is therefore strictly ORDERED, never an
// AND of the two:
//   1) Linked (product_id set) → derive from product.status ALONE:
//        DRAFT  → 씨앗(작성중)
//        READY  → 발행대기
//        ACTIVE + naverProductId → 발행됨
//        ACTIVE − naverProductId → 등록대기
//        OUT_OF_STOCK → 품절 ; INACTIVE/HIDDEN → 재활성화
//   2) Not linked → sourcing_status (SOURCED / orphan PENDING) → 수집됨
// ============================================================================

export type Stage =
  | 'collected'   // 수집됨 — crawled, not yet a Product
  | 'seed'        // 씨앗(작성중) — Product DRAFT
  | 'ready'       // 발행대기 — Product READY
  | 'pending'     // 등록대기 — ACTIVE but not on Naver yet
  | 'published'   // 발행됨 — ACTIVE + naverProductId
  | 'oos'         // 품절
  | 'inactive';   // 재활성화 필요

export interface StageInput {
  /** crawl_log.product_id present (or any positive link signal). */
  linked?: boolean;
  /** Product.status (DRAFT/READY/ACTIVE/OUT_OF_STOCK/INACTIVE/HIDDEN). */
  productStatus?: string | null;
  /** Product.naverProductId — distinguishes 발행됨 vs 등록대기. */
  naverProductId?: string | null;
  /** crawl_log.sourcing_status — only consulted when NOT linked (#179). */
  sourcingStatus?: string | null;
}

export function deriveStage(i: StageInput): Stage {
  const linked = !!i.linked || !!i.productStatus;
  if (linked) {
    switch ((i.productStatus ?? '').toUpperCase()) {
      case 'DRAFT':         return 'seed';
      case 'READY':         return 'ready';
      case 'ACTIVE':        return i.naverProductId ? 'published' : 'pending';
      case 'OUT_OF_STOCK':  return 'oos';
      case 'INACTIVE':
      case 'HIDDEN':        return 'inactive';
      // Linked but status unknown/legacy — treat as in-progress, never as 수집됨.
      default:              return 'seed';
    }
  }
  // Not linked: sourcing_status is the only signal (SOURCED / orphan PENDING).
  return 'collected';
}

interface StageMeta { label: string; bg: string; color: string; dot: string; }

// Colors follow the app's status palette (de-facto tokens): gray=수집/작성, green=
// 발행대기/발행됨, amber=등록대기, red=품절, orange=재활성화.
const STAGE_META: Record<Stage, StageMeta> = {
  collected: { label: '수집됨',   bg: '#F3F4F6', color: '#6B7280', dot: '#9CA3AF' },
  seed:      { label: '씨앗',     bg: '#F8F4EC', color: '#92744B', dot: '#C2A06A' },
  ready:     { label: '발행대기', bg: '#DCFCE7', color: '#15803D', dot: '#22C55E' },
  pending:   { label: '등록대기', bg: '#FEF3C7', color: '#92400E', dot: '#F59E0B' },
  published: { label: '발행됨',   bg: '#DCFCE7', color: '#166534', dot: '#16A34A' },
  oos:       { label: '품절',     bg: '#FEE2E2', color: '#B91C1C', dot: '#E8001F' },
  inactive:  { label: '재활성화', bg: '#FFEDD5', color: '#C2410C', dot: '#FB923C' },
};

export function stageMeta(stage: Stage): StageMeta {
  return STAGE_META[stage];
}

export function StageBadge({ size = 'md', ...input }: StageInput & { size?: 'sm' | 'md' }) {
  const meta = STAGE_META[deriveStage(input)];
  const pad = size === 'sm' ? '2px 7px' : '3px 9px';
  const fs = size === 'sm' ? 10.5 : 11.5;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: pad, borderRadius: 999, background: meta.bg, color: meta.color,
      fontSize: fs, fontWeight: 800, whiteSpace: 'nowrap', lineHeight: 1.2,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: meta.dot, flexShrink: 0 }} />
      {meta.label}
    </span>
  );
}
