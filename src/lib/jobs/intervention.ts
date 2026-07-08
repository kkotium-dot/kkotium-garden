// src/lib/jobs/intervention.ts
// ============================================================================
// C-9 operator intervention cards — stable type keys, product-agnostic payload
// builders, and a job-seeding helper. These drive the PRECISE Operator Action
// Queue cards (control-tower-engine.actionQueue) off the asset_jobs lifecycle:
// asset_jobs.intervention_type / intervention_payload (migration
// c9_intervention_fields). A bg_clean / product_composite job carries the
// intervention; the type is orthogonal to job_type (no CHECK value added).
//
// Authority: CUTOUT_HERO_STANDARD.md §3 + C9_INTERVENTION_CARDS_BUILD_SPEC.md.
// Universal (#55): NO product hardcoding — payloads derive from productId.
// Korean labels live in control-tower-strings.ko.json (#35); code is key-only.
// ============================================================================

import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { BG_CLEAN, PRODUCT_COMPOSITE } from '@/lib/jobs/job-type-routing';
import {
  applyFidelityToPrompt,
  buildFidelityChecklistPayload,
  buildMountCheckPayload,
  type ProductFidelity,
  type FidelityChecklistPayload,
  type MountCheckPayload,
} from '@/lib/fidelity/product-fidelity';
import { evaluateGuards, type GuardInput } from '@/lib/mood/guards';
import type { MoodGuards } from '@/lib/mood/types';

export const INTERVENTION_SOURCE_REQUEST = 'source_request';
export const INTERVENTION_HERO_CROP_REQUEST = 'hero_crop_request';
export const INTERVENTION_FIREFLY_DROP = 'firefly_drop';
// firefly_auto — same dropkit/prompt payload as firefly_drop, but signals that
// the operator's Firefly tab is detected open so the cuts can be generated +
// drained automatically (FIREFLY_AUTOMATION_PLAYBOOK §3, ingest catch-basin).
// Renders as an informational "auto generate available" card — never a forced modal (#56).
export const INTERVENTION_FIREFLY_AUTO = 'firefly_auto';
// Pre-publish fidelity-check gate (#56): the operator compares the confirmed
// representative / additional images against the product's fidelity card.
export const INTERVENTION_FIDELITY_CHECK = 'fidelity_check';
// Mount-physics check (#56, item 8): clip/slat geometry OK before slot lock.
export const INTERVENTION_MOUNT_CHECK = 'mount_check';
// Asset-integrity guard (#80 follow-up): the live storage listing drifted from
// the product's DB image refs (legacy-root files un-normalized and/or a DB ref
// points at a 404 key). Surfaces "비정규 N·dead M" with a 1-click remediation.
export const INTERVENTION_ASSET_INTEGRITY = 'asset_integrity';
// Engine Stage 1 (#56, IMAGE_SEO_STRATEGY_ENGINE §8 개입#1): the category DNA
// card is stale or a new category is unconfirmed — the operator confirms/edits
// the DNA (season/tone/slots) before mass generation. INPUT_DECISION; deep-links
// to the analyze tab. Auto-confirms (AUTO) when the card is fresh.
export const INTERVENTION_DNA_CONFIRM = 'dna_confirm';
// Engine Stage 1 (#56, §8 개입#2): a slot's candidate gallery is full — the
// operator picks the winning variant (1-click = rating signal). INPUT_DECISION;
// deep-links to the image tab slot.
export const INTERVENTION_VARIANT_SELECT = 'variant_select';
// Engine Stage 1 (#56, #62): the product's Naver category has NO seeded DNA card
// (strategy dnaSource=none) → the funnel falls back to the neutral universal arc.
// An informational nudge to seed real category DNA so category-specific slots
// (scent_note / size_duration / ...) get added. INPUT_DECISION; deep-links to the
// analyze tab. Never a forced modal (#56); surfaced only when the product is
// otherwise idle so it never masks urgent work (firefly_auto-style additive).
export const INTERVENTION_CATEGORY_DNA_UNSEEDED = 'category_dna_unseeded';
// REGISTRY <-> STORAGE drift reconcile (#62 P2). Distinct from asset_integrity
// (depth2/deadRef auto-fix): this is an operator register-vs-archive DECISION per
// orphan. Non-blocking advisory card.
export const INTERVENTION_REGISTRY_DRIFT = 'registry_drift';
// VARIANT <-> COMPOSITE coverage (#62 P2). An option product is missing a bound
// representative composite for one or more in-stock variants. Operator generates
// the missing variant cuts. Non-blocking advisory card.
export const INTERVENTION_VARIANT_COMPOSITE = 'variant_composite';
// SF-5 (#56, SF5_ASSEMBLY_QUEUE_SPEC): assets are ready but the detail page is not
// assembled yet (detail_images empty and/or description carries no assembly copy).
// An idle-priority informational nudge to open the 상세 캔버스 (배양실 탭) — never a
// forced modal, surfaced only when the product is otherwise idle so it never masks
// urgent work (category_dna_unseeded-style additive). INPUT_DECISION.
export const INTERVENTION_DETAIL_ASSEMBLY = 'detail_assembly';

// PL-5a (#209, PL5A_DRIFT_DETECTION_SPEC): a LINKED product's live Naver listing
// has drifted from the app-SoR fields (name/salePrice/representativeImageUrl). An
// idle-priority nudge (mirrors detail_assembly gating) that surfaces "동기화 필요"
// on the control tower without a new queue UI. Reflecting drift (push) stays
// GO-gated in PL-2/PL-3. Read-only detection. INPUT_DECISION.
export const INTERVENTION_SYNC_DRIFT = 'sync_drift';

export type InterventionType =
  | typeof INTERVENTION_SOURCE_REQUEST
  | typeof INTERVENTION_HERO_CROP_REQUEST
  | typeof INTERVENTION_FIREFLY_DROP
  | typeof INTERVENTION_FIREFLY_AUTO
  | typeof INTERVENTION_FIDELITY_CHECK
  | typeof INTERVENTION_MOUNT_CHECK
  | typeof INTERVENTION_ASSET_INTEGRITY
  | typeof INTERVENTION_DNA_CONFIRM
  | typeof INTERVENTION_VARIANT_SELECT
  | typeof INTERVENTION_CATEGORY_DNA_UNSEEDED
  | typeof INTERVENTION_REGISTRY_DRIFT
  | typeof INTERVENTION_VARIANT_COMPOSITE
  | typeof INTERVENTION_DETAIL_ASSEMBLY
  | typeof INTERVENTION_SYNC_DRIFT;

export { buildMountCheckPayload };
export type { FidelityChecklistPayload, MountCheckPayload };

// A hero cutout source whose longest edge is below this is too small to upscale
// cleanly — request a fresh crop instead (CUTOUT_HERO_STANDARD §3 trigger).
export const HERO_MIN_EDGE = 300;

// Firefly 3-plane composite defaults (CUTOUT_HERO_STANDARD §2 track 2). Generic
// scaffolds — the operator adapts the concept per product (no myeonghwa text).
export const FIREFLY_MODEL = 'Nano Banana Pro';
export const FIREFLY_RATIO = '4:3';

export interface FireflyDropPayload {
  dropkitPath: string;
  promptTrack1: string;
  promptTrack2: string;
  model: string;
  ratio: string;
  // firefly_auto only (#77, playbook §8): the browser driver ran
  // kkAssertGenerateMode() and confirmed the canvas is in GENERATE mode (not
  // edit) before triggering. Undefined/false → the queue shows a pending-
  // verification gate so the operator does not ingest an edit-mode contaminated
  // cut. Optional + additive — firefly_drop never sets it.
  generateModeConfirmed?: boolean;
  // firefly_auto only (#77, SCENT_MOOD_BACKGROUND_SYSTEM §2-3): the browser
  // driver verified the four Firefly generation settings before triggering, so
  // a cut is not silently degraded (auto-ratio / 1K / grounding-off / stale
  // reference lock). Each flag true = that setting matches the per-purpose
  // convention. Absent/partial → the queue shows a pending-verification gate.
  // Optional + additive — firefly_drop never sets it.
  settingsVerified?: {
    ratio: boolean;       // 16:9 lifestyle / 1:1 thumb / 3:4 detail
    resolution: boolean;  // 2K+ premium cut
    grounding: boolean;   // Google grounding on for structure-real scenes
    reference: boolean;   // reference lock intentionally managed (not stale)
  };
  // firefly_auto only (#84/#86, MOOD_CAMERA_SPEC_SYSTEM §4): the five mood-camera
  // guards for this generation batch — camera variety (no single default),
  // reference cleared (edit-mode contamination), settings verified, positive
  // exclusion present, benchmark DNA set. Optional + additive — only the
  // mood-camera generation path sets it; firefly_drop never does.
  moodGuards?: MoodGuards;
}
export interface HeroCropPayload {
  guide: string;       // i18n key for the crop guidance text
  minEdge: number;
  longestEdge: number;
  textDetected: boolean;
}
export interface SourceRequestPayload {
  supplierUrl: string | null;
  productId: string;
}

/**
 * Firefly drop payload — dropkit path + 3-plane prompt scaffolds. When a
 * fidelity card is supplied, its promptInject is prepended and decorForbidden
 * is appended as an "Avoid: ..." negative clause to BOTH tracks, so the
 * operator's Firefly prompt carries the reality anchor (true scale, label hero,
 * banned decor). Still product-agnostic — the fidelity is passed in, never
 * hardcoded (#55).
 */
export function buildFireflyDropPayload(
  productId: string,
  fidelity?: ProductFidelity | null,
): FireflyDropPayload {
  const track1Base =
    'Track 1 (info): clean studio still-life of the product on a warm wood and linen surface, soft daylight, gentle contact shadow, photorealistic, no text, no watermark.';
  const track2Base =
    'Track 2 (mood): premium lifestyle scene with the product as the hero in its real use context, softly blurred backdrop, warm editorial grade, shallow depth of field, photorealistic, no text, no watermark.';
  return {
    dropkitPath: `assets/generated/${productId}/cutout/`,
    promptTrack1: applyFidelityToPrompt(track1Base, fidelity ?? null),
    promptTrack2: applyFidelityToPrompt(track2Base, fidelity ?? null),
    model: FIREFLY_MODEL,
    ratio: FIREFLY_RATIO,
  };
}

/**
 * Mood-camera guards (#84/#86) — compute the five subchecks for a generation
 * batch from the assembled prompts (camera variety / exclusion / benchmark DNA)
 * plus the two driver-confirmed runtime signals (reference cleared / settings
 * verified). Thin pass-through to the pure evaluator in src/lib/mood/guards so
 * the same logic backs both the unit tests and the firefly_auto card. Product-
 * agnostic — the batch is supplied, never hardcoded (#55).
 */
export function buildMoodGuards(input: GuardInput): MoodGuards {
  return evaluateGuards(input);
}

/**
 * Fidelity-check payload (#56) — built from the product's fidelity card. Seeded
 * onto an awaiting_human image-track job when the operator finalizes the
 * representative / additional images, so the Operator Action Queue surfaces a
 * "compare against the fidelity card" gate before the irreversible publish.
 */
export function buildFidelityCheckPayload(
  productId: string,
  fidelity: ProductFidelity,
): FidelityChecklistPayload {
  return buildFidelityChecklistPayload(productId, fidelity);
}

/** Hero-crop request payload — the source was too small or carried text. */
export function buildHeroCropPayload(o: { longestEdge: number; textDetected: boolean }): HeroCropPayload {
  return {
    guide: 'full_subject_real_photo',
    minEdge: HERO_MIN_EDGE,
    longestEdge: o.longestEdge,
    textDetected: o.textDetected,
  };
}

/** Source-request payload — the detail-source is missing for this product. */
export function buildSourceRequestPayload(o: { productId: string; supplierUrl?: string | null }): SourceRequestPayload {
  return { supplierUrl: o.supplierUrl ?? null, productId: o.productId };
}

// Engine Stage 1 intervention payloads (#56) — minimal, product-agnostic.
export interface DnaConfirmPayload {
  productId: string;
  categoryCode: string;
  categoryName: string;
  dnaVersion: number;
  // Why the card needs review: stale capture vs. an unconfirmed new category.
  reason: 'stale' | 'new_category';
}
export interface VariantSelectPayload {
  productId: string;
  slotType: string;
  // Candidate slot-generation ids the operator chooses among.
  candidateIds: string[];
  recommendedId?: string;
}

/** DNA-confirm payload — the category card is stale or newly captured. */
export function buildDnaConfirmPayload(o: {
  productId: string;
  categoryCode: string;
  categoryName: string;
  dnaVersion: number;
  reason: 'stale' | 'new_category';
}): DnaConfirmPayload {
  return {
    productId: o.productId,
    categoryCode: o.categoryCode,
    categoryName: o.categoryName,
    dnaVersion: o.dnaVersion,
    reason: o.reason,
  };
}

/** Variant-select payload — a slot's candidate gallery is full. */
export function buildVariantSelectPayload(o: {
  productId: string;
  slotType: string;
  candidateIds: string[];
  recommendedId?: string;
}): VariantSelectPayload {
  return {
    productId: o.productId,
    slotType: o.slotType,
    candidateIds: o.candidateIds,
    recommendedId: o.recommendedId,
  };
}

export interface CategoryDnaUnseededPayload {
  productId: string;
  // The unseeded Naver category code (empty when the product has no code).
  categoryCode: string;
  // Human-readable category label for the card (code itself when unknown).
  categoryName: string;
}

/** Unseeded-DNA payload — the category has no seeded DNA card (#62). */
export function buildCategoryDnaUnseededPayload(o: {
  productId: string;
  categoryCode: string;
  categoryName: string;
}): CategoryDnaUnseededPayload {
  return {
    productId: o.productId,
    categoryCode: o.categoryCode,
    categoryName: o.categoryName,
  };
}

export interface AssetIntegrityPayload {
  productId: string;
  /** Legacy-root files needing normalization into a stage subfolder. */
  depth2Count: number;
  /** DB refs pointing at a key absent from the live listing (404). */
  deadCount: number;
  /** Of the above, how many the 1-click fix can resolve. */
  fixableDepth2: number;
  fixableDeadRefs: number;
  /** (Optional) ratio non-conformance flags (composite!=4:5 / thumbnail!=1:1). */
  ratioCount: number;
  /** Sample file names (bounded) for the operator to recognize the drift. */
  sampleFiles: string[];
  checkedAt: string;
}

/** Asset-integrity payload — built from a checkProductIntegrity report shape. */
export function buildAssetIntegrityPayload(o: {
  productId: string;
  depth2Count: number;
  deadCount: number;
  fixableDepth2: number;
  fixableDeadRefs: number;
  ratioCount?: number;
  sampleFiles?: string[];
  checkedAt: string;
}): AssetIntegrityPayload {
  return {
    productId: o.productId,
    depth2Count: o.depth2Count,
    deadCount: o.deadCount,
    fixableDepth2: o.fixableDepth2,
    fixableDeadRefs: o.fixableDeadRefs,
    ratioCount: o.ratioCount ?? 0,
    sampleFiles: (o.sampleFiles ?? []).slice(0, 6),
    checkedAt: o.checkedAt,
  };
}

export interface RegistryDriftPayload {
  productId: string;
  /** Live storage files absent from asset_registry (keeper-or-archive decision). */
  storageOnlyCount: number;
  /** Registry rows whose physical file is gone (clear decision). */
  registryOnlyCount: number;
  /** Physical stage folders absent from the taxonomy. */
  undefinedStages: string[];
  /** Sample orphan file names (bounded) for the operator to recognize the drift. */
  sampleFiles: string[];
  checkedAt: string;
}

/** Registry-drift payload — built from a checkProductIntegrity registryDrift. */
export function buildRegistryDriftPayload(o: {
  productId: string;
  storageOnlyCount: number;
  registryOnlyCount: number;
  undefinedStages?: string[];
  sampleFiles?: string[];
  checkedAt: string;
}): RegistryDriftPayload {
  return {
    productId: o.productId,
    storageOnlyCount: o.storageOnlyCount,
    registryOnlyCount: o.registryOnlyCount,
    undefinedStages: (o.undefinedStages ?? []).slice(0, 8),
    sampleFiles: (o.sampleFiles ?? []).slice(0, 6),
    checkedAt: o.checkedAt,
  };
}

export interface VariantCompositePayload {
  productId: string;
  /** In-stock variant values (denominator). */
  active: string[];
  /** Active variants with a bound, live composite. */
  covered: string[];
  /** Active variants still missing a bound composite. */
  missing: string[];
  /** covered / active, in [0,1]. */
  ratio: number;
  checkedAt: string;
}

/** Variant-composite payload — built from a computeVariantCoverage result. */
export function buildVariantCompositePayload(o: {
  productId: string;
  active: string[];
  covered: string[];
  missing: string[];
  ratio: number;
  checkedAt: string;
}): VariantCompositePayload {
  return {
    productId: o.productId,
    active: o.active.slice(0, 24),
    covered: o.covered.slice(0, 24),
    missing: o.missing.slice(0, 24),
    ratio: o.ratio,
    checkedAt: o.checkedAt,
  };
}

export interface DetailAssemblyPayload {
  productId: string;
  /** detail_images empty — no images assigned to the detail page yet. */
  missingImages: boolean;
  /** description carries no assembly copy (blank/placeholder). */
  missingCopy: boolean;
}

/** Detail-assembly payload (SF-5) — assets ready but detail page not assembled. */
export function buildDetailAssemblyPayload(o: {
  productId: string;
  missingImages: boolean;
  missingCopy: boolean;
}): DetailAssemblyPayload {
  return { productId: o.productId, missingImages: o.missingImages, missingCopy: o.missingCopy };
}

// Open (non-terminal) statuses — an existing such job is reused before creating.
const OPEN_STATUSES: string[] = [
  'awaiting_human', 'human_done', 'in_progress', 'ready', 'pending', 'blocked', 'review',
];

// jobType → lane (image lanes only; intervention cards are image-track).
const LANE_FOR_JOBTYPE: Record<string, string> = {
  [BG_CLEAN]: 'process',
  [PRODUCT_COMPOSITE]: 'compose',
};

/**
 * Seed (or update the latest open) asset_job to await a human intervention. The
 * job carries intervention_type/payload and status='awaiting_human' so the
 * control-tower queue renders the precise card. Returns the job id, or null on
 * any error (callers treat seeding as best-effort, never fatal).
 */
export async function setJobIntervention(opts: {
  productId: string;
  jobType: string;             // BG_CLEAN | PRODUCT_COMPOSITE — a valid CHECK value
  type: InterventionType;
  payload: unknown;
  tool?: string;
  /** When true, reuse an open job ONLY if it already carries THIS intervention
   *  type — so distinct interventions sharing a jobType (e.g. firefly_drop and
   *  fidelity_check both on product_composite) never clobber each other. */
  matchInterventionType?: boolean;
}): Promise<{ jobId: string; created: boolean } | null> {
  try {
    const data = {
      status: 'awaiting_human',
      interventionType: opts.type,
      interventionPayload: (opts.payload ?? Prisma.JsonNull) as Prisma.InputJsonValue,
    };
    const existing = await prisma.assetJob.findFirst({
      where: {
        productId: opts.productId,
        jobType: opts.jobType,
        status: { in: OPEN_STATUSES },
        ...(opts.matchInterventionType ? { interventionType: opts.type } : {}),
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });
    if (existing) {
      await prisma.assetJob.update({ where: { id: existing.id }, data });
      return { jobId: existing.id, created: false };
    }
    const created = await prisma.assetJob.create({
      data: {
        productId: opts.productId,
        lane: LANE_FOR_JOBTYPE[opts.jobType] ?? 'process',
        jobType: opts.jobType,
        tool: opts.tool ?? 'firefly',
        ipSafe: true,
        ...data,
      },
      select: { id: true },
    });
    return { jobId: created.id, created: true };
  } catch {
    return null;
  }
}

/**
 * Resolve (close) any OPEN job carrying a given intervention type for a product
 * by moving it to a terminal status so the control-tower queue stops rendering
 * the card. Used when a standing check (e.g. asset_integrity) finds the product
 * is now clean. Best-effort — returns the count cleared, or 0 on any error.
 */
export async function clearJobIntervention(
  productId: string,
  type: InterventionType,
): Promise<number> {
  try {
    const res = await prisma.assetJob.updateMany({
      where: { productId, interventionType: type, status: { in: OPEN_STATUSES } },
      data: { status: 'done' },
    });
    return res.count;
  } catch {
    return 0;
  }
}
