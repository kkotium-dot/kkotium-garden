// src/lib/automation/lifestyle-picker.ts
//
// Sprint 7-M2 Phase 2-c-1 (v3.1 FINAL Smart Asset Workflow) — backdrop
// asset picker for the `lifestyle` thumbnail variant.
//
// Source-of-truth spec:
//   - docs/research/SMART_ASSET_WORKFLOW_V3_1_FINAL_2026_05.md
//   - Prisma model: LifestyleAsset (id / category / tags[] / moodTags[] /
//     storageUrl / lastUsedAt / usedBySkus[])
//
// Design notes
//   - Pure backend module. Caller (route layer) decides timing of
//     `markLifestyleAssetUsed` so render failures don't burn assets.
//   - 30-day cooldown is the default per the v3.1 FINAL spec. Same asset
//     is not re-served for any product within the window.
//   - Per-SKU exclusion ensures the same asset is never reused for the
//     same product on a re-run.
//   - When the candidate pool is empty, the function returns null and
//     the caller falls back to the existing brand-color backdrop path —
//     no thumbnail render failure.
//   - ConceptTone → tag preferences mapping is intentionally simple
//     (string-equal overlap). The Prisma schema already supports
//     additional axes (colorPalette JSON) for future enhancement.

import { prisma } from '@/lib/prisma';
import type { ConceptTone } from '@/lib/diagnosis/concept-tone-inference';

export interface PickLifestyleOpts {
  /** ConceptTone derived from the most recent Diagnosis row. Required. */
  conceptTone: ConceptTone;
  /** Free-text product category for loose `category` matching. Optional. */
  productCategory?: string;
  /** SKU of the product the picker is serving. Used to exclude assets
   *  already consumed by this product (per-SKU history) and to update
   *  `usedBySkus` when the caller marks the asset used. */
  sku: string;
  /** Cooldown window in days. Defaults to 30 (matches v3.1 FINAL spec). */
  cooldownDays?: number;
  /** Maximum number of candidates fetched from DB before scoring. Defaults
   *  to 20 — enough to converge on a confident match without scanning the
   *  entire library. */
  candidateLimit?: number;
}

export interface PickLifestyleResult {
  assetId: string;
  storageUrl: string;
  width: number;
  height: number;
  source: string;
  matchedTags: string[];
  matchedMoodTags: string[];
  /** Higher = better match (sum of overlap counts; mood weighted 1.5x). */
  matchScore: number;
}

/** Map a ConceptTone to candidate tag strings used for overlap matching
 *  against LifestyleAsset.tags / moodTags. Mirrors the spec's 8-axis
 *  taxonomy 1:1 — the picker doesn't invent new tag names. */
function deriveTagPreferences(c: ConceptTone): { tags: string[]; moodTags: string[] } {
  return {
    tags: [c.persona, c.context, c.pricePosition, c.productType],
    moodTags: [c.colorMood, c.emotionalTone, c.photoStyle, c.genre],
  };
}

/** Pick a lifestyle backdrop asset that matches the product's ConceptTone
 *  and respects the 30-day cooldown + per-SKU exclusion. Returns null when
 *  no eligible asset exists — caller should fall back to the brand-color
 *  backdrop. */
export async function pickLifestyleAsset(
  opts: PickLifestyleOpts,
): Promise<PickLifestyleResult | null> {
  const cooldownDays = opts.cooldownDays ?? 30;
  const cooldownCutoff = new Date(Date.now() - cooldownDays * 24 * 60 * 60 * 1000);
  const candidateLimit = opts.candidateLimit ?? 20;
  const { tags, moodTags } = deriveTagPreferences(opts.conceptTone);

  const candidates = await prisma.lifestyleAsset.findMany({
    where: {
      AND: [
        // Cooldown: never used, or last used before the cutoff
        {
          OR: [
            { lastUsedAt: null },
            { lastUsedAt: { lt: cooldownCutoff } },
          ],
        },
        // Per-SKU exclusion: asset has not been served to this product
        { NOT: { usedBySkus: { has: opts.sku } } },
        // Relevance: at least one of (tags overlap | moodTags overlap |
        // category exact). Loose OR keeps the candidate pool > 0 even
        // when the library is sparse.
        {
          OR: [
            { tags: { hasSome: tags } },
            { moodTags: { hasSome: moodTags } },
            ...(opts.productCategory ? [{ category: opts.productCategory }] : []),
          ],
        },
      ],
    },
    take: candidateLimit,
    orderBy: [
      // Oldest unused first (or never-used = NULL bubbled to top in asc)
      { lastUsedAt: 'asc' as const },
      { createdAt: 'desc' as const },
    ],
  });

  if (candidates.length === 0) return null;

  // Score by tag overlap. moodTags weighted 1.5x because color/genre
  // alignment is more visually significant than persona/context for
  // backdrop selection.
  let best: typeof candidates[number] | null = null;
  let bestScore = -1;
  let bestMatchedTags: string[] = [];
  let bestMatchedMoodTags: string[] = [];

  for (const c of candidates) {
    const matchedTags = c.tags.filter((t) => tags.includes(t));
    const matchedMoodTags = c.moodTags.filter((t) => moodTags.includes(t));
    const score = matchedTags.length + matchedMoodTags.length * 1.5;
    if (score > bestScore) {
      bestScore = score;
      best = c;
      bestMatchedTags = matchedTags;
      bestMatchedMoodTags = matchedMoodTags;
    }
  }

  if (!best) return null;

  return {
    assetId: best.id,
    storageUrl: best.storageUrl,
    width: best.width,
    height: best.height,
    source: best.source,
    matchedTags: bestMatchedTags,
    matchedMoodTags: bestMatchedMoodTags,
    matchScore: bestScore,
  };
}

/** Mark a lifestyle asset as used by a SKU. Updates lastUsedAt + appends
 *  the SKU to usedBySkus. Idempotent — calling twice with the same SKU
 *  doesn't duplicate the entry (Prisma `push` operator is safe but we
 *  filter just in case the schema changes later). */
export async function markLifestyleAssetUsed(
  assetId: string,
  sku: string,
): Promise<void> {
  // Re-read current usedBySkus to avoid duplicate inserts
  const current = await prisma.lifestyleAsset.findUnique({
    where: { id: assetId },
    select: { usedBySkus: true },
  });
  if (!current) return;
  const nextUsedBySkus = current.usedBySkus.includes(sku)
    ? current.usedBySkus
    : [...current.usedBySkus, sku];
  await prisma.lifestyleAsset.update({
    where: { id: assetId },
    data: {
      lastUsedAt: new Date(),
      usedBySkus: nextUsedBySkus,
    },
  });
}
