// src/lib/dome-category-cache.ts
// ============================================================================
// Sprint 6-E (Session F = Phase 5): Domeggook Category Cache
// ============================================================================
//
// Two complementary caches with a single goal: cut the per-product Gemini
// AI call in /api/category/suggest from "always" to "cache miss only".
//
// 1. DomeCategory — refreshed weekly from getCat ver 2.0. Used as authoritative
//    reference for dome-side category codes + names.
//
// 2. CategoryMapping — learned cache. Two lookup-kinds:
//      - 'dome_code'  (key = dome categoryCode) — set when we crawl a product
//                     and know its dome category. Stable signal.
//      - 'name_hash'  (key = normalized product name token-hash) — set when
//                     we only have the product name (no dome code yet) and
//                     fall back to AI. Stable across re-tries of the same name.
//
// Hit-rate strategy:
//   On every /api/category/suggest call we first try CategoryMapping by both
//   lookup-kinds, then fall through to AI / fallback rules. Successful AI
//   results are written back so the next call with the same key short-circuits.
//
// Cron integration:
//   refreshDomeCategoryTree() is called from /api/cron/weekly (no new vercel
//   cron — Hobby plan 2 cron limit avoided). Domeggook categories change
//   slowly; weekly is plenty.
// ============================================================================

import { createHash } from 'crypto';
import { prisma } from '@/lib/prisma';
import { getAdapter } from '@/lib/sources';

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

export type LookupKind = 'dome_code' | 'name_hash';
export type MappingSource = 'ai' | 'fallback' | 'manual';

export interface CachedMapping {
  d1: string;
  d2: string;
  d3: string;
  d4: string | null;
  naverCategoryCode: string | null;
  confidence: number;
  source: MappingSource;
  hitCount: number;
}

export interface RefreshResult {
  fetched: number;
  upserted: number;
  durationMs: number;
}

// ----------------------------------------------------------------------------
// Mapping cache CRUD
// ----------------------------------------------------------------------------

/**
 * Look up a learned mapping. Returns null on miss. Increments hitCount +
 * lastHitAt on hit so the cache reflects real usage.
 */
export async function getCachedMapping(
  kind: LookupKind,
  key: string,
): Promise<CachedMapping | null> {
  const normalizedKey = normalizeKey(kind, key);
  if (!normalizedKey) return null;

  const row = await prisma.categoryMapping.findUnique({
    where: { lookupKind_lookupKey: { lookupKind: kind, lookupKey: normalizedKey } },
  });
  if (!row) return null;

  // Update hit stats best-effort (do not block on failure)
  prisma.categoryMapping.update({
    where: { id: row.id },
    data: { hitCount: { increment: 1 }, lastHitAt: new Date() },
  }).catch(() => undefined);

  return {
    d1: row.naverD1,
    d2: row.naverD2,
    d3: row.naverD3,
    d4: row.naverD4,
    naverCategoryCode: row.naverCategoryCode,
    confidence: row.confidence,
    source: row.source as MappingSource,
    hitCount: row.hitCount,
  };
}

/**
 * Save (upsert) a learned mapping. Used after AI / fallback path succeeds.
 * Re-saving the same key resets confidence + source (treat newest as truth).
 */
export async function saveMapping(args: {
  kind: LookupKind;
  key: string;
  d1: string;
  d2: string;
  d3: string;
  d4?: string | null;
  naverCategoryCode?: string | null;
  confidence: number;
  source: MappingSource;
}): Promise<void> {
  const normalizedKey = normalizeKey(args.kind, args.key);
  if (!normalizedKey) return;

  await prisma.categoryMapping.upsert({
    where: { lookupKind_lookupKey: { lookupKind: args.kind, lookupKey: normalizedKey } },
    create: {
      lookupKind: args.kind,
      lookupKey:  normalizedKey,
      naverD1:    args.d1,
      naverD2:    args.d2,
      naverD3:    args.d3,
      naverD4:    args.d4 ?? null,
      naverCategoryCode: args.naverCategoryCode ?? null,
      confidence: clampConfidence(args.confidence),
      source:     args.source,
    },
    update: {
      naverD1:    args.d1,
      naverD2:    args.d2,
      naverD3:    args.d3,
      naverD4:    args.d4 ?? null,
      naverCategoryCode: args.naverCategoryCode ?? null,
      confidence: clampConfidence(args.confidence),
      source:     args.source,
    },
  });
}

/**
 * Build the name_hash key from a product name. Stable across whitespace
 * variations and case (Korean tokens preserved verbatim).
 */
export function nameHashKey(productName: string): string {
  const normalized = productName.trim().replace(/\s+/g, ' ').toLowerCase();
  if (!normalized) return '';
  return createHash('sha1').update(normalized).digest('hex').slice(0, 32);
}

// ----------------------------------------------------------------------------
// Dome tree cache (refreshed weekly)
// ----------------------------------------------------------------------------

/**
 * Pull the full domeggook category tree from getCat ver 2.0 and upsert into
 * `dome_categories`. Idempotent — re-running just refreshes refreshed_at and
 * any name/count drift. Returns counts for cron logging.
 */
export async function refreshDomeCategoryTree(): Promise<RefreshResult> {
  const startedAt = Date.now();
  const adapter = getAdapter('DMM');
  if (!adapter) {
    return { fetched: 0, upserted: 0, durationMs: Date.now() - startedAt };
  }

  const categories = await adapter.getCategories();

  // Batch via createMany with skipDuplicates + then upsert known codes.
  // For postgres we use a single SQL UPSERT loop to avoid N+1 round-trips
  // exceeding the cron timeout window. Categories are bounded to ~5k rows
  // so this is well within memory.
  let upserted = 0;
  // Chunked upsert: prisma does not yet support array upsert, so we serialize.
  for (const c of categories) {
    await prisma.domeCategory.upsert({
      where: { code: c.code },
      create: {
        code: c.code,
        name: c.name,
        depth: c.depth,
        parentCode: c.parentCode,
        itemCount: c.itemCount,
      },
      update: {
        name: c.name,
        depth: c.depth,
        parentCode: c.parentCode,
        itemCount: c.itemCount,
        refreshedAt: new Date(),
      },
    });
    upserted += 1;
  }

  return { fetched: categories.length, upserted, durationMs: Date.now() - startedAt };
}

/**
 * Read the cached dome category tree. Returns empty array when the cache has
 * not been populated yet (first run before weekly cron).
 */
export async function readCachedDomeTree(): Promise<
  Array<{ code: string; name: string; depth: number; parentCode: string | null; itemCount: number }>
> {
  return prisma.domeCategory.findMany({
    orderBy: [{ depth: 'asc' }, { name: 'asc' }],
    select: { code: true, name: true, depth: true, parentCode: true, itemCount: true },
  });
}

// ----------------------------------------------------------------------------
// Internal helpers
// ----------------------------------------------------------------------------

function normalizeKey(kind: LookupKind, key: string): string {
  const trimmed = key.trim();
  if (!trimmed) return '';
  // dome codes are short numeric strings; preserve as-is. name_hash already
  // hex-encoded by nameHashKey. Truncate defensively to schema limit.
  return trimmed.slice(0, 120);
}

function clampConfidence(value: number): number {
  if (!Number.isFinite(value)) return 70;
  return Math.max(0, Math.min(100, Math.round(value)));
}
