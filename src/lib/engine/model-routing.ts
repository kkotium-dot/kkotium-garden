// src/lib/engine/model-routing.ts
// ============================================================================
// Per-slot model routing + grounding tactic (engine spec §6 / handoff §3e).
// Pure decision over a SlotPlanEntry + DNA card. The blueprint carries sensible
// defaults; this layer is the single place that can refine the route and is the
// authority the assembler consults.
//
//   - hero cutout            -> local cutout-strategy / sharp-composite ('cutout')
//   - in-image text/numbers  -> nano_banana_pro (Korean text, factual infographic)
//   - sensory / lifestyle    -> firefly_native (commercial-safe base, ref-drop)
//   - high-volume variation  -> nano_banana_2
//
// Grounding ON when geometry/place/facts/in-image-text must be real; OFF for
// abstract mood (no benefit, just latency/credits). No external image API is
// called at runtime here — this only chooses a route (#37/#38).
// ============================================================================

import type { AssembledSlotStrategy, CategoryDnaCard, ModelRoute, SlotPlanEntry } from './types';

export interface RouteDecision {
  model: ModelRoute;
  grounding: boolean;
  rationale: string;
}

/**
 * Resolve the model route + grounding for one slot.
 * @param entry The decided slot plan entry
 * @param _card DNA card (reserved for category-level route tuning, e.g. brand model)
 */
export function routeModel(
  entry: SlotPlanEntry,
  _card?: CategoryDnaCard,
): RouteDecision {
  // Representative cutout stays local — commercial-safe, deterministic, no API.
  if (entry.slotType === 'hero') {
    return {
      model: 'cutout',
      grounding: true,
      rationale: 'representative thumbnail = local cutout (single product, text-free)',
    };
  }

  // Spec / factual slots with real numbers or in-image text -> NB Pro.
  if (entry.contentType === 'spec' || (entry.groundingFlag && entry.textPolicy === 'text_allowed' && entry.conversionJob === 'social_proof')) {
    return {
      model: 'nano_banana_pro',
      grounding: true,
      rationale: 'in-image text / factual numbers require grounded NB Pro',
    };
  }

  // Pure empathy / problem scenes -> high-volume variation lane.
  if (entry.slotType === 'problem') {
    return {
      model: 'nano_banana_2',
      grounding: false,
      rationale: 'abstract empathy scene, high-volume variation',
    };
  }

  // Sensory / lifestyle / gift / brand -> Firefly native (ref-drop, commercial-safe).
  return {
    model: 'firefly_native',
    grounding: entry.groundingFlag,
    rationale: entry.groundingFlag
      ? 'grounded product geometry on commercial-safe Firefly base'
      : 'sensory/lifestyle mood on commercial-safe Firefly base',
  };
}

/** Convenience: apply routing onto an assembled slot strategy in place. */
export function applyRoute(
  slot: AssembledSlotStrategy,
  entry: SlotPlanEntry,
  card?: CategoryDnaCard,
): AssembledSlotStrategy {
  const r = routeModel(entry, card);
  return { ...slot, modelRoute: r.model, grounding: r.grounding };
}
