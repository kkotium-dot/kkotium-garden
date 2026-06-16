// src/lib/engine/slot-decision-table.ts
// ============================================================================
// 9-slot decision table (engine spec §4 / handoff §3c). Pure function:
//   (CategoryDnaCard + product attributes) -> ordered SlotPlanEntry[].
//
// Rules (engine spec §4):
//   - DNA mandatorySlots are forced required.
//   - size-uncertain (apparel/furniture)      -> size_duration required
//   - trust-sensitive (food/cosmetics/kids)    -> trust required
//   - gift-biased                              -> gift required (kept in plan)
//   - low-involvement commodity                -> arc shortened (optional,
//                                                 non-mandatory slots dropped)
//
// Output order follows the DNA slotSequence (falls back to the blueprint order).
// All-product common (#55) — no per-product branch code; everything is data.
// ============================================================================

import type { CategoryDnaCard, SlotPlanEntry, SlotType } from './types';
import { SLOT_BLUEPRINT, SlotBlueprint } from './slot-blueprint';
import { SLOT_TYPES } from './types';
// Korean match-keywords live in JSON data (not TS literals, §5 gate). They are
// matched against Korean category / product text, so the tokens are inherently
// Korean — keeping them as data keeps the logic layer literal-free.
import signalKeywords from './seeds/product-signal-keywords.json';

// Product attributes that modulate the slot plan (engine spec §4 decision rows).
export interface ProductSlotSignals {
  sizeUncertain?: boolean; // apparel / furniture / anything fit-sensitive
  trustSensitive?: boolean; // food / cosmetics / kids / safety-critical
  giftBiased?: boolean; // gift-occasion demand
  lowInvolvement?: boolean; // commodity / impulse -> shorten the arc
}

function buildEntry(bp: SlotBlueprint, required: boolean): SlotPlanEntry {
  return {
    slotType: bp.slotType,
    conversionJob: bp.conversionJob,
    contentType: bp.contentType,
    mood: bp.mood,
    realismLane: bp.realismLane,
    composition: bp.composition,
    legibility: bp.legibility,
    textPolicy: bp.textPolicy,
    compositeFlag: bp.compositeFlag,
    groundingFlag: bp.groundingFlag,
    modelRoute: bp.modelRoute,
    aspect: bp.aspect,
    required,
    sectionIds: bp.sectionIds,
  };
}

/**
 * Decide the ordered slot plan for one product.
 * @param card    Category DNA card (drives sequence + mandatory slots)
 * @param signals Product attributes that force/relax slots
 * @returns Ordered SlotPlanEntry[] (representative `hero` always first)
 */
export function decideSlotPlan(
  card: CategoryDnaCard,
  signals: ProductSlotSignals = {},
): SlotPlanEntry[] {
  const mandatory = new Set<SlotType>(card.mandatorySlots ?? []);

  // Attribute-driven forced slots (engine spec §4).
  if (signals.sizeUncertain) mandatory.add('size_duration');
  if (signals.trustSensitive) mandatory.add('trust');
  if (signals.giftBiased) mandatory.add('gift');

  // Sequence: DNA order, filtered to valid slot types, deduped; fall back to the
  // canonical blueprint order so every plan is complete and ordered.
  const seq = (card.slotSequence ?? []).filter((s): s is SlotType =>
    (SLOT_TYPES as readonly string[]).includes(s),
  );
  const ordered: SlotType[] = [];
  const seen = new Set<SlotType>();
  for (const s of seq.length > 0 ? seq : SLOT_TYPES) {
    if (!seen.has(s)) {
      seen.add(s);
      ordered.push(s);
    }
  }
  // Ensure hero + cta are always present (structural anchors).
  for (const anchor of ['hero', 'cta'] as SlotType[]) {
    if (!seen.has(anchor)) {
      seen.add(anchor);
      anchor === 'hero' ? ordered.unshift(anchor) : ordered.push(anchor);
    }
  }

  const entries: SlotPlanEntry[] = [];
  for (const slot of ordered) {
    const bp = SLOT_BLUEPRINT[slot];
    if (!bp) continue;
    const required = bp.requiredByDefault || mandatory.has(slot);

    // Low-involvement: drop optional, non-mandatory slots to shorten the arc.
    // hero + cta (structural) and any required slot always survive.
    if (signals.lowInvolvement && !required) continue;

    entries.push(buildEntry(bp, required));
  }
  return entries;
}

/**
 * Heuristic product-signal derivation from category text + product name. Keeps
 * the decision table pure while giving callers a sensible default when explicit
 * signals are not supplied. Conservative — only flips a signal on clear cues.
 */
export function deriveProductSignals(
  categoryName: string | null | undefined,
  productName: string | null | undefined,
): ProductSlotSignals {
  const hay = `${categoryName ?? ''} ${productName ?? ''}`.toLowerCase();
  const has = (keys: string[]) => keys.some((k) => hay.includes(k.toLowerCase()));

  const giftBiased = has(signalKeywords.giftBiased);

  // Low-involvement (#62 guard): a refill that ships WITH the main item (a
  // main+refill bundle) or a gift bundle is NOT an impulse commodity — its
  // funnel should keep its full story/spec arc, not be shortened. So when the
  // low-involvement signal is refill-DRIVEN (not a hard commodity term) and the
  // product is a main+refill bundle or gift (bundleAnchor / giftBiased), do not
  // flip lowInvolvement. This restores slots (problem/size_duration) that
  // arc-shortening would otherwise drop.
  const lowBase = has(signalKeywords.lowInvolvement);
  const refillDriven = has(signalKeywords.refillTerms);
  const hardCommodity = has(signalKeywords.commodityHard);
  const bundledOrGift = has(signalKeywords.bundleAnchor) || giftBiased;
  const lowInvolvement = lowBase && !(refillDriven && !hardCommodity && bundledOrGift);

  return {
    sizeUncertain: has(signalKeywords.sizeUncertain),
    trustSensitive: has(signalKeywords.trustSensitive),
    giftBiased,
    lowInvolvement,
  };
}
