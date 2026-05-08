// src/lib/recommendation-runner.ts
// Kkotti 4-mode recommendation runner — Sprint 6-D (data layer + mode logic)
//
// This file orchestrates the 4 modes by reusing the existing infrastructure:
// - generateSourcingRecommendations() in sourcing-recommender.ts
// - getActiveSeasonalEvents() in recommendation-modes.ts
// - searchShopping() / analyzeCompetition() in naver/shopping-search.ts
// - matchWholesaleProducts() in wholesale-matcher.ts
//
// Each mode runs as a thin filter/sort wrapper over the existing data flow,
// keeping API call cost minimal and behavior consistent with current sourcing logic.

import { generateSourcingRecommendations, type SourcingOpportunity } from '@/lib/sourcing-recommender';
import { searchShopping, analyzeCompetition } from '@/lib/naver/shopping-search';
import { matchWholesaleProducts } from '@/lib/wholesale-matcher';
import { prisma } from '@/lib/prisma';
import {
  type ModeResult,
  type FourModeResult,
  type RecommendationMode,
  MODE_META,
  getActiveSeasonalEvents,
  dedupeFlatten,
} from '@/lib/recommendation-modes';

// ── Internal: shared base data ───────────────────────────────────────────────

/**
 * Run the heavy sourcing pipeline once and reuse output for all 4 modes.
 * This avoids 4x API cost when called from a single Discord/UI consumer.
 */
async function getBaseOpportunities(): Promise<SourcingOpportunity[]> {
  const result = await generateSourcingRecommendations();
  if (result.error || !result.opportunities) return [];
  return result.opportunities;
}

// Map external competition level (uppercase) to SourcingOpportunity competition (lowercase union)
function mapCompetitionLevel(
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH'
): SourcingOpportunity['competition'] {
  switch (level) {
    case 'LOW':       return 'low';
    case 'MEDIUM':    return 'mid';
    case 'HIGH':      return 'high';
    case 'VERY_HIGH': return 'high';
  }
}

// ── Mode 1: CURRENT_HOT — top items by trend volume + margin ─────────────────

function runCurrentHot(base: SourcingOpportunity[], topN: number): ModeResult {
  // Sort by (search volume) primarily, (margin) as tiebreaker
  const sorted = [...base]
    .sort((a, b) => {
      if (b.monthlySearchVolume !== a.monthlySearchVolume) {
        return b.monthlySearchVolume - a.monthlySearchVolume;
      }
      return b.estimatedMargin - a.estimatedMargin;
    })
    .slice(0, topN);

  return {
    mode: 'CURRENT_HOT',
    items: sorted,
    skipReason: sorted.length === 0 ? 'no_match' : undefined,
  };
}

// ── Mode 2: SEASONAL_AHEAD — seasonal D-30 lead time ────────────────────────

async function runSeasonalAhead(topN: number): Promise<ModeResult> {
  const events = getActiveSeasonalEvents();
  if (events.length === 0) {
    return {
      mode: 'SEASONAL_AHEAD',
      items: [],
      skipReason: 'no_match',
    };
  }

  // Take the closest event and search its keywords on Naver Shopping
  const nearest = events[0];
  const items: SourcingOpportunity[] = [];

  for (const kw of nearest.event.keywords.slice(0, 3)) {
    try {
      const competition = await analyzeCompetition(kw);
      const search = await searchShopping(kw, { display: 5 });
      if (!competition || competition.totalResults === 0) continue;

      const avgPrice = competition.avgPrice ?? 0;
      const supplyPrice = Math.round(avgPrice * 0.4);
      const estimatedMargin = avgPrice > 0 ? Math.round(((avgPrice - supplyPrice) / avgPrice) * 100) : 0;

      // Wholesale match (best-effort)
      let wholesaleMatches: SourcingOpportunity['wholesaleMatches'];
      let wholesalePlatforms: SourcingOpportunity['wholesalePlatforms'];
      try {
        const ws = await matchWholesaleProducts(kw, avgPrice);
        wholesaleMatches = ws.matches;
        wholesalePlatforms = ws.searchedPlatforms;
      } catch { /* non-fatal */ }

      items.push({
        keyword: kw,
        category: nearest.event.label,
        monthlySearchVolume: 0, // SEASONAL_AHEAD does not depend on search volume
        competition: mapCompetitionLevel(competition.competitionLevel),
        avgPrice,
        minPrice: competition.minPrice ?? 0,
        maxPrice: competition.maxPrice ?? 0,
        totalResults: competition.totalResults,
        competitionLevel: competition.competitionLevel,
        suggestedSupplyPrice: supplyPrice,
        estimatedMargin,
        blueOceanScore: 50, // baseline
        reason: `seasonal D-${events[0].daysLeft}: ${nearest.event.label}`,
        topSellers: search.items.slice(0, 3).map(it => it.mallName ?? '').filter(Boolean),
        wholesaleMatches,
        wholesalePlatforms,
      });

      if (items.length >= topN) break;
    } catch { /* skip failed keyword */ }
    await new Promise(r => setTimeout(r, 300));
  }

  return {
    mode: 'SEASONAL_AHEAD',
    items,
    contextNote: `${nearest.event.label} D-${nearest.daysLeft}`,
    skipReason: items.length === 0 ? 'no_match' : undefined,
  };
}

// ── Mode 3: NICHE_BLUE — low competition + decent margin ────────────────────

function runNicheBlue(base: SourcingOpportunity[], topN: number): ModeResult {
  // Filter: low competition AND margin >= 25%, sort by blueOcean score
  const filtered = base
    .filter(opp => opp.competition === 'low' && opp.estimatedMargin >= 25)
    .sort((a, b) => b.blueOceanScore - a.blueOceanScore)
    .slice(0, topN);

  return {
    mode: 'NICHE_BLUE',
    items: filtered,
    skipReason: filtered.length === 0 ? 'no_match' : undefined,
  };
}

// ── Mode 4: STORE_FIT — match seller's past category history ────────────────

async function runStoreFit(
  base: SourcingOpportunity[],
  topN: number,
  userId?: string
): Promise<ModeResult> {
  if (!userId) {
    return { mode: 'STORE_FIT', items: [], skipReason: 'no_store_data' };
  }

  // Pull seller's registered product category codes (top 3 by frequency)
  let topCategoryCodes: string[] = [];
  try {
    const products = await prisma.product.findMany({
      where: { userId, status: { in: ['ACTIVE', 'OUT_OF_STOCK'] } },
      select: { naverCategoryCode: true },
      take: 100,
    });
    const categoryFreq = new Map<string, number>();
    for (const p of products) {
      const cat = p.naverCategoryCode;
      if (cat) categoryFreq.set(cat, (categoryFreq.get(cat) ?? 0) + 1);
    }
    topCategoryCodes = Array.from(categoryFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([cat]) => cat);
  } catch {
    return { mode: 'STORE_FIT', items: [], skipReason: 'no_store_data' };
  }

  if (topCategoryCodes.length === 0) {
    return { mode: 'STORE_FIT', items: [], skipReason: 'no_store_data' };
  }

  // Filter base opportunities by category code match (loose substring match;
  // SourcingOpportunity.category may hold a name OR a code depending on source).
  const matched = base
    .filter(opp =>
      topCategoryCodes.some(code =>
        opp.category && (opp.category.includes(code) || code.includes(opp.category))
      )
    )
    .sort((a, b) => b.blueOceanScore - a.blueOceanScore)
    .slice(0, topN);

  return {
    mode: 'STORE_FIT',
    items: matched,
    contextNote: topCategoryCodes.length > 0 ? topCategoryCodes.slice(0, 2).join(' / ') : undefined,
    skipReason: matched.length === 0 ? 'no_match' : undefined,
  };
}

// ── Public API ───────────────────────────────────────────────────────────────

export interface RunFourModesInput {
  /** Modes to run; defaults to all 4 */
  modes?: RecommendationMode[];
  /** Optional userId for STORE_FIT */
  userId?: string;
}

/**
 * Run the 4-mode recommendation pipeline.
 * Returns mode-by-mode results plus a deduplicated flat list for legacy consumers.
 */
export async function runFourModes(input: RunFourModesInput = {}): Promise<FourModeResult> {
  const requestedModes = input.modes ?? ['CURRENT_HOT', 'SEASONAL_AHEAD', 'NICHE_BLUE', 'STORE_FIT'];
  const base = await getBaseOpportunities();

  const results: ModeResult[] = [];

  for (const mode of requestedModes) {
    const meta = MODE_META[mode];
    try {
      switch (mode) {
        case 'CURRENT_HOT':
          results.push(runCurrentHot(base, meta.topN));
          break;
        case 'SEASONAL_AHEAD':
          results.push(await runSeasonalAhead(meta.topN));
          break;
        case 'NICHE_BLUE':
          results.push(runNicheBlue(base, meta.topN));
          break;
        case 'STORE_FIT':
          results.push(await runStoreFit(base, meta.topN, input.userId));
          break;
      }
    } catch {
      results.push({ mode, items: [], skipReason: 'api_error' });
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    modes: results,
    flat: dedupeFlatten(results),
  };
}
