// src/lib/art-director/prompt-curator.ts
//
// Sprint 7-M2 5-B — Reinforcement-learning curator for prompt assets.
//
// Spec: docs/plan/HANDOFF_CTR_CVR_PIPELINE.md §3.
//
// What this does
//   1. Group active prompts by (intent_tag, category_hint).
//   2. Within each group, rank by business_metrics.revenueAttribution30d.
//   3. Promote the top 20% (writes business_metrics.promoted = true).
//   4. Deprecate the bottom 20% (sets deprecated=true + reason).
//
// Sample guard (anti-noise)
//   A group is curated only when BOTH:
//     - promptCount >= minGroupSize (default 5)
//     - sum of orders30d across the group >= minTotalOrders (default 3)
//   Otherwise the group is skipped with a reason.
//
// CTR / impressions are intentionally ignored — they are null under the
// CVR-only data path (see metrics-collector.ts).

import { prisma } from '@/lib/prisma';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CurateOptions {
  minGroupSize?: number;
  minTotalOrders?: number;
  topPercentile?: number;
  bottomPercentile?: number;
  dryRun?: boolean;
}

export interface CurateGroupResult {
  intentTag: string;
  categoryHint: string;
  promptCount: number;
  totalOrders: number;
  totalRevenue: number;
  promoted: string[];
  deprecated: string[];
  skipped?: string;
}

export interface CurateResult {
  groupsConsidered: number;
  groupsCurated: number;
  promotedCount: number;
  deprecatedCount: number;
  groups: CurateGroupResult[];
}

interface PromptRow {
  id: string;
  intentTag: string | null;
  categoryHint: string;
  businessMetrics: unknown;
}

interface PerfStats {
  revenue: number;
  orders: number;
}

// ---------------------------------------------------------------------------
// business_metrics readers (defensive — the column is Json with no schema enforcement)
// ---------------------------------------------------------------------------

function readPerf(metrics: unknown): PerfStats {
  if (!metrics || typeof metrics !== 'object') return { revenue: 0, orders: 0 };
  const m = metrics as Record<string, unknown>;
  const revenue =
    typeof m.revenueAttribution30d === 'number' ? m.revenueAttribution30d : 0;
  const orders = typeof m.orders30d === 'number' ? m.orders30d : 0;
  return { revenue, orders };
}

function withPromotedFlag(metrics: unknown, promoted: boolean): object {
  const base =
    metrics && typeof metrics === 'object' ? { ...(metrics as object) } : {};
  return { ...base, promoted };
}

// ---------------------------------------------------------------------------
// Grouping
// ---------------------------------------------------------------------------

type GroupKey = string; // `${intentTag}::${categoryHint}`

function keyOf(intentTag: string, categoryHint: string): GroupKey {
  return `${intentTag}::${categoryHint}`;
}

// ---------------------------------------------------------------------------
// Main entry
// ---------------------------------------------------------------------------

export async function curatePromptsByPerformance(
  opts: CurateOptions = {},
): Promise<CurateResult> {
  const minGroupSize = opts.minGroupSize ?? 5;
  const minTotalOrders = opts.minTotalOrders ?? 3;
  const topPct = opts.topPercentile ?? 0.2;
  const bottomPct = opts.bottomPercentile ?? 0.2;
  const dryRun = opts.dryRun ?? false;

  // Only curate prompts that are real (not base templates) and not already
  // deprecated. We exclude category_hint='template' so the seed rows stay
  // untouched.
  const prompts: PromptRow[] = await prisma.artDirectorPrompt.findMany({
    where: {
      deprecated: false,
      sellerUsed: true,
      productId: { not: null },
      intentTag: { not: null },
      NOT: { categoryHint: 'template' },
    },
    select: {
      id: true,
      intentTag: true,
      categoryHint: true,
      businessMetrics: true,
    },
  });

  const groups = new Map<GroupKey, PromptRow[]>();
  for (const p of prompts) {
    if (!p.intentTag) continue;
    const k = keyOf(p.intentTag, p.categoryHint);
    const slot = groups.get(k) ?? [];
    slot.push(p);
    groups.set(k, slot);
  }

  const groupResults: CurateGroupResult[] = [];
  let promotedTotal = 0;
  let deprecatedTotal = 0;
  let curatedGroups = 0;

  for (const [k, rows] of groups.entries()) {
    const [intentTag, categoryHint] = k.split('::');
    const perf = rows.map((r) => ({ row: r, ...readPerf(r.businessMetrics) }));
    const totalOrders = perf.reduce((s, x) => s + x.orders, 0);
    const totalRevenue = perf.reduce((s, x) => s + x.revenue, 0);

    if (rows.length < minGroupSize) {
      groupResults.push({
        intentTag,
        categoryHint,
        promptCount: rows.length,
        totalOrders,
        totalRevenue,
        promoted: [],
        deprecated: [],
        skipped: `group size ${rows.length} < minGroupSize ${minGroupSize}`,
      });
      continue;
    }
    if (totalOrders < minTotalOrders) {
      groupResults.push({
        intentTag,
        categoryHint,
        promptCount: rows.length,
        totalOrders,
        totalRevenue,
        promoted: [],
        deprecated: [],
        skipped: `total orders ${totalOrders} < minTotalOrders ${minTotalOrders}`,
      });
      continue;
    }

    // Rank by revenue desc, tie-break by orders desc.
    perf.sort((a, b) => b.revenue - a.revenue || b.orders - a.orders);

    const topCount = Math.max(1, Math.floor(rows.length * topPct));
    const bottomCount = Math.max(1, Math.floor(rows.length * bottomPct));
    const topRows = perf.slice(0, topCount);
    // Bottom slice must not overlap with the top slice when the group is small.
    const bottomRows = perf
      .slice(-bottomCount)
      .filter((b) => !topRows.some((t) => t.row.id === b.row.id))
      // Only deprecate when the prompt had a real chance to perform — at
      // least one order recorded — otherwise we punish unseen prompts.
      .filter((b) => b.orders > 0);

    const promoted: string[] = [];
    const deprecated: string[] = [];

    for (const t of topRows) {
      if (!dryRun) {
        await prisma.artDirectorPrompt.update({
          where: { id: t.row.id },
          data: {
            businessMetrics: withPromotedFlag(
              t.row.businessMetrics,
              true,
            ) as unknown as object,
          },
        });
      }
      promoted.push(t.row.id);
    }

    for (const b of bottomRows) {
      if (!dryRun) {
        await prisma.artDirectorPrompt.update({
          where: { id: b.row.id },
          data: {
            deprecated: true,
            deprecationReason: 'low CVR over 30d',
            businessMetrics: withPromotedFlag(
              b.row.businessMetrics,
              false,
            ) as unknown as object,
          },
        });
      }
      deprecated.push(b.row.id);
    }

    promotedTotal += promoted.length;
    deprecatedTotal += deprecated.length;
    curatedGroups += 1;

    groupResults.push({
      intentTag,
      categoryHint,
      promptCount: rows.length,
      totalOrders,
      totalRevenue,
      promoted,
      deprecated,
    });
  }

  return {
    groupsConsidered: groups.size,
    groupsCurated: curatedGroups,
    promotedCount: promotedTotal,
    deprecatedCount: deprecatedTotal,
    groups: groupResults,
  };
}
