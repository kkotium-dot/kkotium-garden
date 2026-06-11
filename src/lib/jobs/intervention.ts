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

export const INTERVENTION_SOURCE_REQUEST = 'source_request';
export const INTERVENTION_HERO_CROP_REQUEST = 'hero_crop_request';
export const INTERVENTION_FIREFLY_DROP = 'firefly_drop';

export type InterventionType =
  | typeof INTERVENTION_SOURCE_REQUEST
  | typeof INTERVENTION_HERO_CROP_REQUEST
  | typeof INTERVENTION_FIREFLY_DROP;

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

/** Firefly drop payload — dropkit path + product-agnostic 3-plane prompt scaffolds. */
export function buildFireflyDropPayload(productId: string): FireflyDropPayload {
  return {
    dropkitPath: `assets/generated/${productId}/cutout/`,
    promptTrack1:
      'Track 1 (info): clean studio still-life of the product on a warm wood and linen surface, soft daylight, gentle contact shadow, photorealistic, no text, no watermark.',
    promptTrack2:
      'Track 2 (mood): premium lifestyle scene with the product as the hero in its real use context, softly blurred backdrop, warm editorial grade, shallow depth of field, photorealistic, no text, no watermark.',
    model: FIREFLY_MODEL,
    ratio: FIREFLY_RATIO,
  };
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
}): Promise<{ jobId: string; created: boolean } | null> {
  try {
    const data = {
      status: 'awaiting_human',
      interventionType: opts.type,
      interventionPayload: (opts.payload ?? Prisma.JsonNull) as Prisma.InputJsonValue,
    };
    const existing = await prisma.assetJob.findFirst({
      where: { productId: opts.productId, jobType: opts.jobType, status: { in: OPEN_STATUSES } },
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
