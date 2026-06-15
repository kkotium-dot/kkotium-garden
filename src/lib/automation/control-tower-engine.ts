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
// Type-only — keeps this module pure (quality-classifier pulls in sharp at load).
import type { RecommendedMode } from '@/lib/images/quality-classifier';
// Pure const (seo-guard-linter transitively imports only product-name-checker).
import { MAIN_IMAGE_POLICY_LIFESTYLE } from '@/lib/seo/seo-guard-linter';

// Workflow line (handoff §4). A = good assets → crop / as-is; B = low quality or
// high commerce value → generate / build. Mirrors quality-classifier's
// ENHANCE_THRESHOLD (40) without importing it (sharp-free).
const LINE_ENHANCE_THRESHOLD = 40;
export type ProductLine = 'A' | 'B';
export type LineSource = 'auto' | 'operator';
export interface LineInfo { value: ProductLine; source: LineSource }

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
  | 'crop_pick'           // line A image step → crop studio (pick/region crop)
  | 'build_image'         // line B image step → swap (generate / build)
  | 'apply_curated_main'  // a curated representative must be applied before GO
  | 'build_detail'        // a curated detail page must be applied before GO
  | 'resolve_suspension'  // registered but Naver statusType != SALE (SUSPENSION)
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

// Apply-status indicator (#54 — always state what is actually live). NO red.
//   ApplyState (attributes/publish): LIVE / DB / none.
//   ImageApplyState (main/detail): curated (app pipeline asset) / default
//     (supplier-original passthrough) / none. Curated is detected by the app's
//     automation-storage bucket (product-assets) — a supplier raw image reads
//     'default', so applyStatus stops over-claiming a proper asset.
//   publishState is derived from the cached Naver statusType (NOT the app
//     status): only a confirmed SALE is LIVE; a registered non-SALE (e.g.
//     SUSPENSION) sets publishDrift and is NOT live.
export type ApplyState = 'LIVE' | 'DB' | 'none';
export type ImageApplyState = 'none' | 'default' | 'curated';
// Two-branch routing (IMAGE_DETAIL_TWO_BRANCH_SYSTEM §3) from the split quality
// eval (supplier detail good? + thumbnail good?):
//   A         — detail good + thumb good → both as-is + SEO boost
//   A_EXTRACT — detail good + thumb weak → detail as-is + crop thumb from it
//   MIXED     — detail weak + thumb good → thumb as-is + build detail
//   B         — both weak → crop + generate
//   unknown   — supplier detail not captured yet (run capture first)
export type SourceStrategy = 'A' | 'A_EXTRACT' | 'MIXED' | 'B' | 'unknown';
export interface ApplyStatus {
  attributesApplied: ApplyState;
  mainImageApplied: ImageApplyState;
  detailApplied: ImageApplyState;
  publishState: ApplyState;
  publishDrift: boolean; // registered but Naver statusType != SALE (e.g. SUSPENSION)
  sourceStrategy: SourceStrategy;
}

// Curated = produced/applied by the app pipeline (automation-storage bucket).
// default = a supplier-original passthrough. none = absent.
function classifyImage(url: string | null | undefined): ImageApplyState {
  if (!hasText(url)) return 'none';
  return /\/product-assets\//.test(url as string) ? 'curated' : 'default';
}

// Detail is curated ONLY when a real built detail was applied (the apply-detail
// route sets quality_reasons.detailCurated after a mostly_blank check) — a blank
// skeleton in product-assets reads 'default', not 'curated' (#54 accuracy).
function classifyDetail(url: string | null | undefined, curatedFlag: boolean): ImageApplyState {
  if (!hasText(url)) return 'none';
  return curatedFlag && /\/product-assets\//.test(url as string) ? 'curated' : 'default';
}

// Operator action queue (#56 — surface every intervention naturally). Derived
// from nextAction + image/publish gates, NOT a new column. Pairs with
// applyStatus: applyStatus = "what is done" (result axis), actionQueue = "what
// the operator must do" (action axis). 4 categories (blueprint §3):
//   AUTO           — app is progressing autonomously; no action needed now (green)
//   INPUT_DECISION — operator must decide or input something (amber)
//   GO_PENDING     — ready, awaiting the explicit irreversible publish GO (red)
//   AUTH           — external login / CAPTCHA / creative connector (paused)
export type ActionCategory = 'AUTO' | 'INPUT_DECISION' | 'GO_PENDING' | 'AUTH';
export interface ActionQueueItem {
  productId: string;
  productName: string;
  category: ActionCategory;
  stage: string;          // stable English stage key (UI maps to Korean)
  deepLink: string;       // 1-click target screen
  detail?: string;        // optional data token (e.g. missing attributes)
  // C-9 precise intervention (asset_jobs.intervention_type/payload). Both
  // optional — present only when the active image job carries an intervention,
  // so existing consumers/callers are unaffected (hero_crop/source/firefly).
  interventionType?: string;
  payload?: unknown;      // pass-through for the card (dropkit path/prompt/guide)
  // firefly_auto generate-mode gate (#77). false/undefined → the card shows a
  // pending-verification state (the driver has not confirmed GENERATE mode via
  // kkAssertGenerateMode). Only set on a firefly_auto item; additive.
  generateModeConfirmed?: boolean;
  // firefly_auto generation-settings gate (#77, SCENT_MOOD_BACKGROUND_SYSTEM
  // §2-3). true only when all four settings (ratio/resolution/grounding/
  // reference) are verified; false/undefined → pending. Only set on a
  // firefly_auto item; additive.
  settingsVerified?: boolean;
}

export interface ControlTowerRow {
  productId: string;
  name: string;
  publish: PublishInfo;
  image: ImageInfo;
  line: LineInfo;
  applyStatus: ApplyStatus;
  actionQueue: ActionQueueItem;
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
  // Line classification inputs (handoff §4). recommendedMode/qualityScore feed
  // the auto classifier; lineOverride (quality_reasons.line when
  // quality_reasons.lineSource==='operator') WINS over the auto result — the
  // operator's decision is authoritative (e.g. myeonghwa score 62 → line A).
  recommendedMode?: RecommendedMode | null;
  qualityScore?: number | null;
  lineOverride?: ProductLine | null;
  // Cached last-observed Naver statusType (SALE / SUSPENSION / ...). null until a
  // Naver inspect has synced it — then publishState is honest about live state.
  naverStatusType?: string | null;
  // quality_reasons.detailCurated — true once a real (non-blank) built detail was
  // applied via apply-detail. Gates detailApplied='curated' (skeleton stays default).
  detailCurated?: boolean;
  // source_detail_url present — full-res supplier detail captured (two-branch).
  hasSourceDetail?: boolean;
  // quality_reasons.sourceDetailGood — the captured supplier detail scored >= the
  // good floor (split quality eval). Drives sourceStrategy A/B/mixed.
  sourceDetailGood?: boolean;
  // Product.main_image_policy (C-4). 'lifestyle_intended' suppresses the curated
  // representative step (operator keeps a non-white-bg hero). null when unset /
  // column not migrated.
  mainImagePolicy?: string | null;
  // C-9: the active image-track job's intervention (asset_jobs.intervention_type
  // / intervention_payload), null when none. The route loads the latest
  // awaiting_human image job and passes it so the queue renders a precise card
  // (firefly_drop / hero_crop_request / source_request) instead of generic AUTH.
  imageJobIntervention?: { type: string; payload?: unknown } | null;
}

// C-9 intervention type keys (mirror src/lib/jobs/intervention.ts — duplicated
// as plain strings to keep this module dependency-free / pure).
const IV_SOURCE_REQUEST = 'source_request';
const IV_HERO_CROP_REQUEST = 'hero_crop_request';
const IV_FIREFLY_DROP = 'firefly_drop';
const IV_FIREFLY_AUTO = 'firefly_auto';
const IV_FIDELITY_CHECK = 'fidelity_check';
const IV_MOUNT_CHECK = 'mount_check';
const IV_ASSET_INTEGRITY = 'asset_integrity';

/** Two-branch source strategy from the split quality eval (blueprint §3). */
function deriveSourceStrategy(
  hasSourceDetail: boolean,
  detailGood: boolean,
  thumbGood: boolean,
): SourceStrategy {
  if (!hasSourceDetail) return 'unknown';
  if (detailGood && thumbGood) return 'A';
  if (detailGood && !thumbGood) return 'A_EXTRACT';
  if (!detailGood && thumbGood) return 'MIXED';
  return 'B';
}

/**
 * Auto workflow line from quality signals: B (build) when the mode is NEW, the
 * score is below the ENHANCE floor, or there is no usable detail asset;
 * otherwise A (crop / as-is).
 */
export function deriveLine(o: {
  recommendedMode: RecommendedMode | null;
  qualityScore: number | null;
  hasDetail: boolean;
}): ProductLine {
  if (o.recommendedMode === 'NEW') return 'B';
  if (o.qualityScore != null && o.qualityScore < LINE_ENHANCE_THRESHOLD) return 'B';
  if (!o.hasDetail) return 'B';
  return 'A';
}

/** Resolved line — operator override wins, else the auto classification. */
export function resolveLine(ctx: ComputeContext, hasDetail: boolean): LineInfo {
  if (ctx.lineOverride === 'A' || ctx.lineOverride === 'B') {
    return { value: ctx.lineOverride, source: 'operator' };
  }
  return {
    value: deriveLine({
      recommendedMode: ctx.recommendedMode ?? null,
      qualityScore: ctx.qualityScore ?? null,
      hasDetail,
    }),
    source: 'auto',
  };
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

  const line = resolveLine(ctx, hasDetail);

  // Apply-status (#54, 2026-06-08 accuracy): publishState from the cached Naver
  // statusType (not the app status); images classified curated/default/none.
  const tri = (present: boolean): ApplyState => (!present ? 'none' : registered ? 'LIVE' : 'DB');
  const naverStatus = ctx.naverStatusType ?? null;
  let publishState: ApplyState;
  let publishDrift = false;
  if (registered) {
    if (naverStatus === 'SALE') {
      publishState = 'LIVE';
    } else if (naverStatus) {
      publishState = 'none';       // SUSPENSION etc. — registered but NOT live
      publishDrift = true;
    } else {
      publishState = 'DB';         // registered, Naver state not yet synced
    }
  } else {
    publishState = v.canRegister ? 'DB' : 'none';
  }
  const applyStatus: ApplyStatus = {
    attributesApplied: tri(v.canRegister && v.missingRequired.length === 0),
    mainImageApplied: classifyImage(product.mainImage),       // builder field (what PUT sends)
    detailApplied: classifyDetail(product.detail_image_url, ctx.detailCurated ?? false),
    publishState,
    publishDrift,
    // thumb is "good" once a curated rep is applied (a default supplier thumb
    // still needs an extract/crop).
    sourceStrategy: deriveSourceStrategy(
      ctx.hasSourceDetail ?? false,
      ctx.sourceDetailGood ?? false,
      classifyImage(product.mainImage) === 'curated',
    ),
  };

  const overall = overallOf([image.status, publish.status]);
  const nextAction = computeNextAction(product, publish, image, registered, line.value, applyStatus, ctx.mainImagePolicy);
  const actionQueue = computeActionQueueItem(product.id, product.name, image, nextAction, ctx.imageJobIntervention ?? null);

  return { productId: product.id, name: product.name, publish, image, line, applyStatus, actionQueue, overall, nextAction };
}

/**
 * Categorize the (already curated-aware) nextAction into the operator action
 * queue (#56). nextAction is the single SoT ladder — this only assigns a
 * category so the queue and the per-row nextAction chip never disagree (the
 * curated/drift gating lives in computeNextAction). AUTH/AUTO come from the
 * image gate; publish/verify_publish are the only GO_PENDING keys.
 */
export function computeActionQueueItem(
  productId: string,
  productName: string,
  image: ImageInfo,
  nextAction: NextAction | null,
  intervention?: { type: string; payload?: unknown } | null,
): ActionQueueItem {
  const base = { productId, productName };
  // C-9 — a precise image-track intervention. When the awaiting_human job names
  // WHICH intervention, render the precise card (drop / crop / source) instead
  // of the generic AUTH card. firefly_drop is a paused creative-tool handoff
  // (AUTH); hero_crop / source need an operator input/decision (INPUT_DECISION).
  if (image.status === 'awaiting_human' && intervention) {
    const iv = { interventionType: intervention.type, payload: intervention.payload };
    if (intervention.type === IV_FIREFLY_DROP) {
      return { ...base, category: 'AUTH', stage: IV_FIREFLY_DROP, deepLink: `/studio?product=${productId}`, ...iv };
    }
    if (intervention.type === IV_FIREFLY_AUTO) {
      // Firefly tab detected open — cuts can be generated + drained via the
      // ingest catch-basin. Same creative-tool handoff family as firefly_drop
      // (AUTH), just flagged auto-capable; lands in the studio. The generate-mode
      // gate (#77) is surfaced from the payload so the card shows a pending-
      // verification state until the driver confirms GENERATE (not edit) mode.
      const ap = intervention.payload as {
        generateModeConfirmed?: boolean;
        settingsVerified?: { ratio?: boolean; resolution?: boolean; grounding?: boolean; reference?: boolean };
      } | null;
      const gmc = ap?.generateModeConfirmed === true;
      const sv = ap?.settingsVerified;
      // Summary boolean: all four generation settings verified.
      const settingsVerified = !!sv && sv.ratio === true && sv.resolution === true && sv.grounding === true && sv.reference === true;
      return { ...base, category: 'AUTH', stage: IV_FIREFLY_AUTO, deepLink: `/studio?product=${productId}`, ...iv, generateModeConfirmed: gmc, settingsVerified };
    }
    if (intervention.type === IV_HERO_CROP_REQUEST) {
      return { ...base, category: 'INPUT_DECISION', stage: IV_HERO_CROP_REQUEST, deepLink: `/studio?product=${productId}`, ...iv };
    }
    if (intervention.type === IV_SOURCE_REQUEST) {
      return { ...base, category: 'INPUT_DECISION', stage: IV_SOURCE_REQUEST, deepLink: `/products/${productId}`, ...iv };
    }
    if (intervention.type === IV_FIDELITY_CHECK) {
      // Pre-publish gate: operator compares confirmed images vs the fidelity
      // card. A decision (pass / re-do), so INPUT_DECISION; lands in the studio.
      return { ...base, category: 'INPUT_DECISION', stage: IV_FIDELITY_CHECK, deepLink: `/studio?product=${productId}`, ...iv };
    }
    if (intervention.type === IV_MOUNT_CHECK) {
      // Mount-physics check before slot lock — operator verifies clip/slat
      // geometry. A decision, so INPUT_DECISION; lands in the studio.
      return { ...base, category: 'INPUT_DECISION', stage: IV_MOUNT_CHECK, deepLink: `/studio?product=${productId}`, ...iv };
    }
    if (intervention.type === IV_ASSET_INTEGRITY) {
      // Storage<->DB drift (un-normalized root files / dead refs). Operator runs
      // the 1-click remediation, so INPUT_DECISION; lands in the studio asset tab.
      return { ...base, category: 'INPUT_DECISION', stage: IV_ASSET_INTEGRITY, deepLink: `/studio?product=${productId}`, ...iv };
    }
    // Unknown intervention type — fall through to the generic AUTH card below.
  }
  // AUTH — a creative connector / external login is waiting on the operator.
  if (image.status === 'awaiting_human') {
    return { ...base, category: 'AUTH', stage: 'auth_image', deepLink: `/products/${productId}/swap` };
  }
  // AUTO — the pipeline is actively running; nothing for the operator right now.
  if (image.status === 'in_progress') {
    return { ...base, category: 'AUTO', stage: 'processing', deepLink: `/products/${productId}` };
  }
  if (!nextAction) {
    return { ...base, category: 'AUTO', stage: 'monitor', deepLink: `/products/${productId}` };
  }
  // GO_PENDING only when nextAction is the actual publish step (curatedGate
  // already cleared) — otherwise it is a decision/input.
  const category: ActionCategory =
    nextAction.key === 'publish' || nextAction.key === 'verify_publish' ? 'GO_PENDING' : 'INPUT_DECISION';
  return { ...base, category, stage: nextAction.key, deepLink: nextAction.href, detail: nextAction.detail };
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
  line: ProductLine = 'A',
  applyStatus?: ApplyStatus,
  mainImagePolicy?: string | null,
): NextAction | null {
  const id = product.id;

  // C-4 override: a lifestyle-intended representative is kept on purpose, so the
  // curated-main (finish-representative) step is suppressed for this product.
  const lifestyleRep = mainImagePolicy === MAIN_IMAGE_POLICY_LIFESTYLE;

  // Curated-asset gate (shared by both branches) — a default/supplier asset must
  // be replaced by a curated one before any publish GO. Returns the step or null.
  const curatedGate = (): NextAction | null => {
    if (!lifestyleRep && applyStatus && applyStatus.mainImageApplied !== 'curated') {
      return { key: 'apply_curated_main', severity: 'action', href: `/products/${id}/preview` };
    }
    if (applyStatus && applyStatus.detailApplied !== 'curated') {
      return { key: 'build_detail', severity: 'action', href: `/studio` };
    }
    return null;
  };

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
    // 4. Image track not finished yet — route per line: A crops a good asset in
    //    the crop studio (preview); B builds/generates via the swap pipeline.
    if (image.status !== 'done') {
      return line === 'A'
        ? { key: 'crop_pick', severity: 'action', href: `/products/${id}/preview` }
        : { key: 'build_image', severity: 'action', href: `/products/${id}/swap` };
    }
    // 5. Ready — but require curated assets before the publish GO (#54 accuracy).
    return curatedGate() ?? { key: 'publish', severity: 'action', href: `/products/${id}` };
  }

  // 6. Registered. A SUSPENSION drift (registered but not live) is resolved first.
  if (applyStatus?.publishDrift) {
    return { key: 'resolve_suspension', severity: 'action', href: `/products/${id}` };
  }
  //    Safety-target items: the safety-confirmation number (HB...) first.
  if (!hasText(product.naver_certification)) {
    return { key: 'verify_certification', severity: 'review', href: `/products/${id}` };
  }
  // Curated assets before re-publish GO (a registered listing can still carry a
  // supplier-original rep — surface the curated step, not verify_publish).
  const gate = curatedGate();
  if (gate) return gate;
  // T5: route every registered product through the SAME pre-publish review
  // screen (line-aware gate + crop studio + update PUT) so the whole catalog
  // funnels through one pipeline.
  return { key: 'verify_publish', severity: 'review', href: `/products/${id}/preview` };
}
