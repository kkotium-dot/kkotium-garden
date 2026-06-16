// src/lib/engine/category-dna.ts
// ============================================================================
// CategoryDna loader (engine spec §3b). Three concerns:
//   1. (De)serialize the rich CategoryDnaCard <-> the Prisma CategoryDna row
//      (the row spreads the card across Json columns; compositionNorms holds
//       the strategy norms — seasonality / titleConventions / priceTiers /
//       materialCues / slotNotes — that have no dedicated column).
//   2. Derive demographics + seasonality from DataLab outcomes (data -> card).
//   3. DB access via the Prisma singleton (#3-2): load active card / upsert.
//
// Korean analysis content lives in JSON data (seeds/*.json), never as TS
// literals (§5 gate). Runtime: no external image API (#37/#38).
// ============================================================================

import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import type {
  CategoryDnaCard,
  DemographicsSignal,
  SeasonalitySignal,
  SlotType,
} from './types';
import seed50014980 from './seeds/category-dna-50014980.json';
import type { DataLabResponse } from '@/lib/naver/datalab-client';
import { latestRatios } from '@/lib/naver/datalab-client';

// Canonical seed card (typed). Used by the DB seeder and as a deterministic
// fallback when no row exists yet.
export const SEED_DNA_50014980 = seed50014980 as unknown as CategoryDnaCard;

// All canonical seeds, keyed by category code (extend per category, #55).
export const SEED_DNA_CARDS: Record<string, CategoryDnaCard> = {
  [SEED_DNA_50014980.categoryCode]: SEED_DNA_50014980,
};

// ----------------------------------------------------------------------------
// (De)serialize card <-> Prisma row
// ----------------------------------------------------------------------------

type DnaRow = {
  categoryCode: string;
  categoryName: string;
  version: number;
  parentDnaId: string | null;
  thumbnailConventions: Prisma.JsonValue;
  slotSequence: Prisma.JsonValue;
  mandatorySlots: Prisma.JsonValue;
  toneManner: Prisma.JsonValue;
  compositionNorms: Prisma.JsonValue;
  trustSignals: Prisma.JsonValue;
  demographics: Prisma.JsonValue;
  palette: Prisma.JsonValue;
  provenance: Prisma.JsonValue;
  confidence: number;
  status: string;
};

/** Card -> the Json/scalar columns of a CategoryDna create/update payload. */
export function dnaCardToRowData(card: CategoryDnaCard) {
  return {
    categoryCode: card.categoryCode,
    categoryName: card.categoryName,
    version: card.version,
    parentDnaId: card.parentDnaId ?? null,
    thumbnailConventions: card.thumbnailConventions as Prisma.InputJsonValue,
    slotSequence: card.slotSequence as unknown as Prisma.InputJsonValue,
    mandatorySlots: card.mandatorySlots as unknown as Prisma.InputJsonValue,
    toneManner: card.toneManner as Prisma.InputJsonValue,
    // Strategy norms with no dedicated column live here.
    compositionNorms: {
      seasonality: card.seasonality,
      titleConventions: card.titleConventions,
      priceTiers: card.priceTiers,
      materialCues: card.materialCues ?? null,
      slotNotes: card.slotNotes ?? null,
    } as unknown as Prisma.InputJsonValue,
    trustSignals: card.trustSignals as unknown as Prisma.InputJsonValue,
    demographics: card.demographics as unknown as Prisma.InputJsonValue,
    palette: { description: card.toneManner.palette ?? null } as Prisma.InputJsonValue,
    provenance: {
      ...(card.provenance ?? {}),
      limitations: card.limitations ?? [],
    } as Prisma.InputJsonValue,
    confidence: card.confidence,
    status: card.status ?? 'draft',
  };
}

function asObject(v: Prisma.JsonValue | null | undefined): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {};
}

function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
}

/** Prisma row -> the rich CategoryDnaCard the engine consumes. */
export function dnaCardFromRow(row: DnaRow): CategoryDnaCard {
  const norms = asObject(row.compositionNorms);
  const prov = asObject(row.provenance);
  return {
    categoryCode: row.categoryCode,
    categoryName: row.categoryName,
    version: row.version,
    parentDnaId: row.parentDnaId,
    demographics: asObject(row.demographics) as unknown as DemographicsSignal,
    seasonality: (norms.seasonality as SeasonalitySignal) ?? { peakMonths: [] },
    titleConventions: (norms.titleConventions as CategoryDnaCard['titleConventions']) ?? {},
    priceTiers: (norms.priceTiers as CategoryDnaCard['priceTiers']) ?? {},
    materialCues: (norms.materialCues as CategoryDnaCard['materialCues']) ?? undefined,
    trustSignals: asStringArray(row.trustSignals),
    thumbnailConventions:
      (asObject(row.thumbnailConventions) as CategoryDnaCard['thumbnailConventions']) ?? {},
    toneManner: (asObject(row.toneManner) as CategoryDnaCard['toneManner']) ?? {},
    slotSequence: asStringArray(row.slotSequence) as SlotType[],
    mandatorySlots: asStringArray(row.mandatorySlots) as SlotType[],
    slotNotes: (norms.slotNotes as CategoryDnaCard['slotNotes']) ?? undefined,
    provenance: prov,
    confidence: row.confidence,
    limitations: asStringArray(prov.limitations),
    status: (row.status as CategoryDnaCard['status']) ?? 'draft',
  };
}

// ----------------------------------------------------------------------------
// Data -> card: derive demographics / seasonality from DataLab outcomes
// ----------------------------------------------------------------------------

const MONTHS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];

/**
 * Build the demographics age signal from a category/age DataLab response.
 * Picks the lead band (highest latest ratio) and the top-3 core bands.
 */
export function demographicsFromAge(resp: DataLabResponse): DemographicsSignal {
  const rows = latestRatios(resp)
    .map((r) => ({ band: r.group ?? r.title, ratio: r.ratio }))
    .filter((r) => !!r.band)
    .sort((a, b) => b.ratio - a.ratio);
  if (rows.length === 0) return {};
  return {
    ageLead: rows[0].band,
    ageCore: rows.slice(0, 3).map((r) => r.band),
    ageNote: rows.map((r) => `${r.band}=${r.ratio.toFixed(1)}`).join(', '),
  };
}

/**
 * Build a seasonality signal from a single-category monthly trend response.
 * Identifies peak month(s) and trough from the per-period ratios.
 */
export function seasonalityFromTrend(resp: DataLabResponse): SeasonalitySignal {
  const points = resp.results?.[0]?.data ?? [];
  if (points.length === 0) return { peakMonths: [] };
  // Aggregate by calendar month (period is YYYY-MM-DD).
  const byMonth = new Map<string, number[]>();
  for (const p of points) {
    const m = p.period.slice(5, 7);
    if (!MONTHS.includes(m)) continue;
    const arr = byMonth.get(m) ?? [];
    arr.push(p.ratio);
    byMonth.set(m, arr);
  }
  const avg = [...byMonth.entries()]
    .map(([m, rs]) => ({ m, v: rs.reduce((a, b) => a + b, 0) / rs.length }))
    .sort((a, b) => b.v - a.v);
  if (avg.length === 0) return { peakMonths: [] };
  const peak = avg[0];
  const trough = avg[avg.length - 1];
  return {
    peakMonths: [peak.m],
    troughMonth: trough.m,
  };
}

// ----------------------------------------------------------------------------
// DB access (Prisma singleton)
// ----------------------------------------------------------------------------

/**
 * Load the highest-version active card for a category. Falls back to a canonical
 * seed (deterministic) when no row exists, so the engine never blocks on an
 * unseeded category.
 */
export async function loadActiveDnaCard(
  categoryCode: string,
): Promise<{ card: CategoryDnaCard; source: 'db' | 'seed' | 'none' }> {
  const row = await prisma.categoryDna.findFirst({
    where: { categoryCode, status: 'active' },
    orderBy: { version: 'desc' },
  });
  if (row) return { card: dnaCardFromRow(row as unknown as DnaRow), source: 'db' };
  const seed = SEED_DNA_CARDS[categoryCode];
  if (seed) return { card: seed, source: 'seed' };
  return { card: emptyCard(categoryCode), source: 'none' };
}

/** Upsert a card as the current version for its category (seeding path). */
export async function upsertDnaCard(card: CategoryDnaCard): Promise<string> {
  const data = dnaCardToRowData(card);
  const existing = await prisma.categoryDna.findFirst({
    where: { categoryCode: card.categoryCode, version: card.version },
    select: { id: true },
  });
  if (existing) {
    await prisma.categoryDna.update({ where: { id: existing.id }, data });
    return existing.id;
  }
  const created = await prisma.categoryDna.create({ data });
  return created.id;
}

/**
 * Minimal valid card for an unseeded category — category-NEUTRAL universal
 * funnel (#62). The scent/use/size slots are category-specific (scent_note is a
 * fragrance bias, use_install/size_duration are install/spec biases) and must
 * come from a SEEDED DNA card — never from the blind fallback, or every unseeded
 * category (e.g. an ice tray) inherits a perfume slot. So the safe default is
 * the structural arc only; per-category slots are added by seeding real DNA.
 */
export function emptyCard(categoryCode: string): CategoryDnaCard {
  return {
    categoryCode,
    categoryName: categoryCode,
    version: 1,
    demographics: {},
    seasonality: { peakMonths: [] },
    titleConventions: {},
    priceTiers: {},
    trustSignals: [],
    thumbnailConventions: {},
    toneManner: {},
    slotSequence: ['hero', 'problem', 'solution_usp', 'trust', 'gift', 'cta'],
    mandatorySlots: [],
    confidence: 0.3,
    status: 'draft',
  };
}
