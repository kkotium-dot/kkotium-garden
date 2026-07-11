// src/lib/products/revival-score.ts
// ============================================================================
// Revival-candidate scoring (authority docs/design/PRODUCT_LINK_REVIVAL_
// CANDIDATE_SPEC_2026-07-10.md, 원칙 #244 — absorbed into the hub spec #245).
//
// 상품 연동 is NOT a full store clone: it is "select the products that need
// reviving → tune in-app → re-upload". This function ranks how urgently a
// product needs reviving from AVAILABLE signals only, so the operator does not
// have to eyeball the list (#56).
//
// HONESTY (#231): Naver provides no review-count read API, so review signals are
// EXCLUDED — never guessed, never crawled. We score from what the store/product
// row already gives us: statusType (SUSPENSION/OUTOFSTOCK), sale status, product
// name SEO quality, and representative-image coverage.
//
// Pure + deterministic (no I/O, no Date.now) — trivially unit-testable and safe
// to call per-row while rendering the hub list.
// ============================================================================

export interface RevivalSignals {
  /** Cached Naver statusType (SALE / SUSPENSION / OUTOFSTOCK / ...), if known. */
  naverStatusType?: string | null;
  /** App-side status (ACTIVE / OUT_OF_STOCK / INACTIVE / DRAFT / ...). */
  appStatus?: string | null;
  /** Live on the store (naverProductId present) — only these are true revival
   *  candidates; an unregistered draft is "new", not "dead". */
  registered?: boolean;
  /** Product name (for SEO-quality signal). */
  name?: string | null;
  /** Total representative + additional images. */
  imageCount?: number;
}

export type RevivalGrade = 'S' | 'A' | 'B' | 'C';

export interface RevivalResult {
  /** 0–100 urgency. */
  score: number;
  grade: RevivalGrade;
  /** Stable English reason keys (UI maps to Korean). Most-urgent first. */
  reasons: RevivalReason[];
  /** True when this product is worth surfacing as a revival candidate. */
  isCandidate: boolean;
}

export type RevivalReason =
  | 'suspended'        // statusType SUSPENSION — dead listing, top priority
  | 'out_of_stock'     // OUTOFSTOCK — opportunity loss
  | 'weak_name_seo'    // short / low-keyword / special-char heavy name
  | 'thin_images';     // single or no representative image

// Weights (spec §2 표). SUSPENSION/OUTOFSTOCK high; name/image medium.
const W = { suspended: 50, out_of_stock: 35, weak_name_seo: 15, thin_images: 12 } as const;

function isOutOfStock(s: RevivalSignals): boolean {
  const n = (s.naverStatusType ?? '').toUpperCase();
  const a = (s.appStatus ?? '').toUpperCase();
  return n === 'OUTOFSTOCK' || a === 'OUT_OF_STOCK';
}

function isSuspended(s: RevivalSignals): boolean {
  const n = (s.naverStatusType ?? '').toUpperCase();
  // App INACTIVE/HIDDEN mirrors a suspended/closed listing when Naver state
  // is not cached (import maps SUSPENSION → INACTIVE).
  const a = (s.appStatus ?? '').toUpperCase();
  return n === 'SUSPENSION' || n === 'CLOSE' || a === 'INACTIVE' || a === 'HIDDEN';
}

// Weak product-name SEO: too short, too few distinct tokens, or special-char
// heavy (a placeholder / raw supplier name that needs a rename tune).
function isWeakNameSeo(name: string | null | undefined): boolean {
  const n = (name ?? '').trim();
  if (!n) return true;
  if (n.length < 10) return true;
  const tokens = n.split(/\s+/).filter(Boolean);
  if (tokens.length < 3) return true;
  const special = (n.match(/[^\w\s가-힣]/g) ?? []).length;
  return special >= 6;
}

const GRADE_CUTOFF: Array<[number, RevivalGrade]> = [
  [60, 'S'],
  [40, 'A'],
  [20, 'B'],
];

/**
 * Rank how urgently a product needs reviving. Unregistered products (new
 * drafts) are never candidates — they score 0 with grade C — so the hub's
 * "부활 후보" filter only surfaces real store products that have gone stale.
 */
export function computeRevivalScore(signals: RevivalSignals): RevivalResult {
  // A product not on the store cannot be "revived" — it is a new listing.
  if (!signals.registered) {
    return { score: 0, grade: 'C', reasons: [], isCandidate: false };
  }

  const reasons: RevivalReason[] = [];
  let score = 0;

  if (isSuspended(signals)) {
    score += W.suspended;
    reasons.push('suspended');
  }
  if (isOutOfStock(signals)) {
    score += W.out_of_stock;
    reasons.push('out_of_stock');
  }
  if (isWeakNameSeo(signals.name)) {
    score += W.weak_name_seo;
    reasons.push('weak_name_seo');
  }
  if ((signals.imageCount ?? 0) <= 1) {
    score += W.thin_images;
    reasons.push('thin_images');
  }

  if (score > 100) score = 100;

  let grade: RevivalGrade = 'C';
  for (const [cutoff, g] of GRADE_CUTOFF) {
    if (score >= cutoff) {
      grade = g;
      break;
    }
  }

  return { score, grade, reasons, isCandidate: grade === 'S' || grade === 'A' };
}

// ─── Single revival-necessity source (#62/#247) ──────────────────────────────
// revival-score is THE authority for "부활 필요도" (does this listing need
// reviving). product-lifecycle (calcZombieRisk/stage) is a SEPARATE, sales-based
// "라이프사이클 단계" analysis — the two must NOT diverge on "부활 대상". Both the
// hub revival filter AND the dashboard 부활소 count derive their candidate set
// from THIS helper, so the two screens always agree.

/** Shape any product row (DB or hub API) exposes for revival scoring. */
export interface RevivalProductLike {
  naver_status_type?: string | null;
  status?: string | null;
  naverProductId?: string | null;
  name?: string | null;
  mainImage?: string | null;
  images?: unknown;
}

/** Map a product row → RevivalSignals (single mapping shared by every caller). */
export function revivalSignalsFromProduct(p: RevivalProductLike): RevivalSignals {
  const imageCount = (p.mainImage ? 1 : 0) + (Array.isArray(p.images) ? p.images.length : 0);
  return {
    naverStatusType: p.naver_status_type ?? null,
    appStatus: p.status ?? null,
    registered: !!p.naverProductId,
    name: p.name ?? null,
    imageCount,
  };
}

/** Canonical "is this a revival candidate" judgment for a product row. */
export function isRevivalCandidateProduct(p: RevivalProductLike): boolean {
  return computeRevivalScore(revivalSignalsFromProduct(p)).isCandidate;
}
