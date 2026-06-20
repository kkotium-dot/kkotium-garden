// src/lib/automation/thumbnail-assessment.ts
// ============================================================================
// C19 (#56, P1) — representative-image (대표이미지) operator assessment.
//
// The publish-readiness gate's `thumbnailAssessed` flag was structurally always
// false: nothing supplied `thumbnailSignals`, so the representative-thumbnail
// policy gate never ran. There is no runtime OCR/vision detector, so the signal
// is supplied by an OPERATOR ATTESTATION (#56 natural intervention): the operator
// confirms the representative meets Naver's 대표이미지 policy (single product, no
// on-image text, no promo/price/border overlays). On approval we stamp
// Product.thumbnail_assessed_at/_by and the gate injects ATTESTED_PASS_SIGNALS,
// flipping thumbnailAssessed -> true (and thumbnailPass -> true).
//
// The columns are read/written via GUARDED raw SQL — NOT a schema.prisma field —
// so a not-yet-migrated DB is caught (P2021/P2022) and treated as "not assessed",
// and there is no Prisma bare-select coupling (deploy order is unconstrained,
// #26-safe: the migration applies in a separate Supabase-MCP turn). Migration:
// docs/handoff/MIGRATION_c19_thumbnail_assess_2026-06-20.sql.
// ============================================================================

import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import type { ThumbnailCandidateSignals } from '@/lib/naver/thumbnail-policy';

// The signals an operator attestation implies: exactly one product, zero text
// regions, zero overlays — i.e. a policy-compliant representative. Feeding these
// to evaluateThumbnailPolicy yields pass=true (the operator vouched for it).
export const ATTESTED_PASS_SIGNALS: ThumbnailCandidateSignals = {
  textRegionCount: 0,
  productCount: 1,
  overlays: [],
  label: 'operator_attested',
};

export interface ThumbnailAssessment {
  assessedAt: Date;
  assessedBy: string | null;
}

function isMissingColumn(e: unknown): boolean {
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    return e.code === 'P2021' || e.code === 'P2022';
  }
  const msg = e instanceof Error ? e.message : String(e);
  return /column .* does not exist|relation .* does not exist/i.test(msg);
}

/**
 * Batch-read the assessment stamp for the given products. Guarded: a not-yet-
 * migrated column returns an EMPTY map (every product reads as "not assessed"),
 * so the gate keeps its pre-migration behavior with zero regression.
 */
export async function readThumbnailAssessments(
  productIds: string[],
): Promise<Map<string, ThumbnailAssessment>> {
  const out = new Map<string, ThumbnailAssessment>();
  if (productIds.length === 0) return out;
  try {
    const rows = await prisma.$queryRaw<
      Array<{ id: string; thumbnail_assessed_at: Date | null; thumbnail_assessed_by: string | null }>
    >(Prisma.sql`
      SELECT id, thumbnail_assessed_at, thumbnail_assessed_by
      FROM public."Product"
      WHERE id IN (${Prisma.join(productIds)})
        AND thumbnail_assessed_at IS NOT NULL
    `);
    for (const r of rows) {
      if (r.thumbnail_assessed_at) {
        out.set(r.id, { assessedAt: r.thumbnail_assessed_at, assessedBy: r.thumbnail_assessed_by });
      }
    }
  } catch (e) {
    if (!isMissingColumn(e)) throw e;
    // column not migrated yet — treat all as unassessed (no regression).
  }
  return out;
}

export type ThumbnailAssessWriteResult = 'ok' | 'migration_pending';

/** Stamp an operator approval. Guarded: returns 'migration_pending' pre-migration. */
export async function setThumbnailAssessed(
  productId: string,
  assessedBy: string,
): Promise<ThumbnailAssessWriteResult> {
  try {
    await prisma.$executeRaw(Prisma.sql`
      UPDATE public."Product"
      SET thumbnail_assessed_at = NOW(), thumbnail_assessed_by = ${assessedBy}
      WHERE id = ${productId}
    `);
    return 'ok';
  } catch (e) {
    if (isMissingColumn(e)) return 'migration_pending';
    throw e;
  }
}

/** Clear an assessment (operator un-approves / re-edits). Guarded. Reversible. */
export async function clearThumbnailAssessed(
  productId: string,
): Promise<ThumbnailAssessWriteResult> {
  try {
    await prisma.$executeRaw(Prisma.sql`
      UPDATE public."Product"
      SET thumbnail_assessed_at = NULL, thumbnail_assessed_by = NULL
      WHERE id = ${productId}
    `);
    return 'ok';
  } catch (e) {
    if (isMissingColumn(e)) return 'migration_pending';
    throw e;
  }
}
