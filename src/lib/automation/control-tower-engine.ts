// src/lib/automation/control-tower-engine.ts
// ============================================================================
// Control Tower SoT engine (handoff IMAGE_SEO_STRATEGY_ENGINE_2026-06-07, items 1+2).
//
// THE single source of truth that powers the control-tower matrix. Before this,
// the matrix read ONLY asset_jobs, so a product that was actually
// registered/ready on Naver (readinessGrade A/84) but had no asset_jobs rows
// showed risk/blocked/nextAction = null. This engine derives the publish track
// from the SAME readiness verdict the Naver update/register dryRun uses
// (validateForRegistration -> canRegister / readinessGrade / score /
// missingRequired), and the image track from asset_jobs (overlay) + asset
// presence. It also computes a deterministic per-product "next action" so the
// operator's single most-important step is surfaced with a 1-click target.
//
// Pure module: no IO, no Prisma, no Naver. The route loads the rows (Product +
// options + addresses + asset_jobs) and calls computeControlTowerRow per product.
// Korean-free (stable English keys; the widget maps to Korean via strings JSON).
// ============================================================================

import {
  validateForRegistration,
  type LocalProduct,
} from '@/lib/naver/product-builder';

export type TrackStatus =
  | 'done' | 'in_progress' | 'pending' | 'blocked' | 'awaiting_human' | 'none';
export type Overall = 'risk' | 'attention' | 'caution' | 'ok' | 'none';

// Image strategy tier (handoff §B). T0 (use-as-is) detection lands with the T0
// classifier (item 3); until then the engine leaves tier = null and the image
// track is presence/job driven only. The field is reserved here so the contract
// is stable across the item 3 commit.
export type ImageTier = 'T0' | 'T1' | 'T2' | 'T3' | null;

// Stable next-action keys (UI maps to Korean + a button). severity drives color;
// href is the 1-click target the operator lands on.
export type NextActionKey =
  | 'add_main_image'
  | 'fill_attributes'
  | 'resolve_validation'
  | 'prepare_image'
  | 'publish'
  | 'verify_certification'
  | 'verify_publish';

export interface NextAction {
  key: NextActionKey;
  severity: 'blocker' | 'action' | 'review';
  href: string;
  // Optional human-readable detail token (e.g. the missing attribute list) the
  // UI may append. English/data only — never a sentence (kept i18n-safe).
  detail?: string;
}

export interface PublishInfo {
  status: TrackStatus;       // mapped from the readiness verdict
  registered: boolean;       // naverProductId present (live on Naver)
  canRegister: boolean;
  readinessGrade: string;
  readinessScore: number;
  attributeGrade: string;
  attributeScore: number;
  missingRequired: string[]; // missing required attribute names (data) — UI shows verbatim
  errorCount: number;
}

export interface ImageInfo {
  status: TrackStatus;
  hasMain: boolean;
  hasDetail: boolean;
  jobStatuses: string[];
  tier: ImageTier;
}

export interface ControlTowerRow {
  productId: string;
  name: string;
  publish: PublishInfo;
  image: ImageInfo;
  overall: Overall;
  nextAction: NextAction | null;
}

export interface ComputeContext {
  // naverProductId present (live on Naver). LocalProduct does not carry this
  // column, so the route passes it explicitly from the DB row.
  registered: boolean;
  hasShippingTemplate: boolean;
  hasAddresses: boolean;
  // asset_jobs statuses for this product, split by track lane (empty when no
  // jobs / migration pending — the engine then falls back to asset presence).
  imageJobStatuses: string[];
  publishJobStatuses: string[];
  // Image strategy tier (T0..T3) from the persisted quality assessment
  // (quality_reasons.imageTier). null until assess-quality has run (item 3).
  imageTier?: ImageTier;
}

// ── asset_jobs status → track status (mirror of the prior matrix reducer) ─────
export function reduceJobStatus(statuses: string[]): TrackStatus {
  if (statuses.length === 0) return 'none';
  if (statuses.includes('blocked')) return 'blocked';
  if (statuses.includes('awaiting_human')) return 'awaiting_human';
  if (statuses.some(s => s === 'in_progress' || s === 'awaiting_approval' || s === 'human_done' || s === 'review')) return 'in_progress';
  if (statuses.some(s => s === 'pending' || s === 'ready' || s === 'failed' || s === 'rejected')) return 'pending';
  return 'done'; // all done/cancelled
}

function overallOf(tracks: TrackStatus[]): Overall {
  if (tracks.includes('blocked')) return 'risk';
  if (tracks.includes('awaiting_human')) return 'attention';
  if (tracks.includes('in_progress') || tracks.includes('pending')) return 'caution';
  if (tracks.includes('done')) return 'ok';
  return 'none';
}

// Sort key so risk pins to the top, then attention, then caution, then ok.
export const OVERALL_RANK: Record<Overall, number> = {
  risk: 0, attention: 1, caution: 2, ok: 3, none: 4,
};

function hasText(v: unknown): boolean {
  return typeof v === 'string' && v.trim().length > 0;
}

/**
 * Compute one matrix row from a product. The publish track is the readiness SoT
 * (validateForRegistration), the image track is jobs-overlay + asset presence,
 * and nextAction is the operator's single most-important step.
 */
export function computeControlTowerRow(
  product: LocalProduct,
  ctx: ComputeContext,
): ControlTowerRow {
  const registered = ctx.registered;
  const v = validateForRegistration(product, ctx.hasShippingTemplate, ctx.hasAddresses);

  // ── publish track ──────────────────────────────────────────────────────────
  // registered → live (done); ready (canRegister) → pending(actionable);
  // else → blocked (hard errors present).
  const publishStatus: TrackStatus = registered
    ? 'done'
    : v.canRegister
      ? 'pending'
      : 'blocked';

  const publish: PublishInfo = {
    status: publishStatus,
    registered,
    canRegister: v.canRegister,
    readinessGrade: v.readinessGrade,
    readinessScore: v.readinessScore,
    attributeGrade: v.attributeGrade,
    attributeScore: v.attributeScore,
    missingRequired: v.missingRequired,
    errorCount: v.errors.length,
  };

  // ── image track ──────────────────────────────────────────────────────────
  const hasMain = hasText(product.mainImage) || hasText((product as { main_image_url?: string }).main_image_url);
  const hasDetail = hasText(product.detail_image_url);
  let imageStatus: TrackStatus;
  if (ctx.imageJobStatuses.length > 0) {
    imageStatus = reduceJobStatus(ctx.imageJobStatuses);
  } else if (hasMain && hasDetail) {
    imageStatus = 'done';
  } else if (hasMain || hasDetail) {
    imageStatus = 'pending';
  } else {
    imageStatus = 'none';
  }
  const image: ImageInfo = {
    status: imageStatus,
    hasMain,
    hasDetail,
    jobStatuses: ctx.imageJobStatuses,
    tier: ctx.imageTier ?? null, // from quality_reasons.imageTier (item 3)
  };

  const overall = overallOf([image.status, publish.status]);
  const nextAction = computeNextAction(product, publish, image, registered);

  return { productId: product.id, name: product.name, publish, image, overall, nextAction };
}

/**
 * Deterministic next-action ladder (item 2). First match wins. The result is the
 * operator's single most-important step, with a 1-click href.
 */
export function computeNextAction(
  product: LocalProduct,
  publish: PublishInfo,
  image: ImageInfo,
  registered: boolean,
): NextAction | null {
  const id = product.id;

  if (!registered) {
    // 1. Representative image missing — the builder needs product.mainImage, so
    //    surface it first (this is also why canRegister is false). The image
    //    track may still read "pending" off a Supabase thumbnail, so check the
    //    builder field specifically here.
    if (!hasText(product.mainImage)) {
      return { key: 'add_main_image', severity: 'blocker', href: `/products/${id}/swap` };
    }
    // 2. Other hard validation errors (category / price / addresses / readiness D).
    if (!publish.canRegister) {
      return { key: 'resolve_validation', severity: 'blocker', href: `/products/${id}/edit` };
    }
    // 3. canRegister, but required category attributes (e.g. material/color) are
    //    still missing — the publish-quality gate. Surface before "publish".
    if (publish.missingRequired.length > 0) {
      return {
        key: 'fill_attributes',
        severity: 'action',
        href: `/products/${id}/edit`,
        detail: publish.missingRequired.join(', '),
      };
    }
    // 4. Image track not finished yet (detail/crop pending).
    if (image.status !== 'done') {
      return { key: 'prepare_image', severity: 'action', href: `/products/${id}/swap` };
    }
    // 5. Ready — publish.
    return { key: 'publish', severity: 'action', href: `/products/${id}` };
  }

  // 6. Registered (live). The remaining step is verification before any GO.
  //    For safety-target items the safety-confirmation number (HB...) must be
  //    verified first — surface that specifically when it's still null.
  if (!hasText(product.naver_certification)) {
    return { key: 'verify_certification', severity: 'review', href: `/products/${id}` };
  }
  return { key: 'verify_publish', severity: 'review', href: `/products/${id}` };
}
