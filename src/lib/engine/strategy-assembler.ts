// src/lib/engine/strategy-assembler.ts
// ============================================================================
// Strategy assembler (engine spec §5 / handoff §3d). Deterministic, reproducible.
//
// Connects existing systems — NOTHING here re-implements them (#62):
//   - decision table  -> decideSlotPlan (this module's §3c)
//   - 6-axis mood     -> assemblePrompt (src/lib/mood) for the resolved prompt
//   - model routing   -> routeModel (this module's §3e)
//   - funnel/sections -> SlotPlanEntry.sectionIds points at the existing
//                        skeleton/section system (view layer)
//
//   input:  CategoryDnaCard + product + (optional) ProductSlotSignals
//   output: per-slot { resolvedPrompt, model, aspect, grounding } strategy
//
// #86: negativePrompt is never produced — assemblePrompt phrases exclusions
// positively. Realism lane (#71) is carried per slot (photoreal default).
// Pure core (assembleStrategy); DB persistence is a separate opt-in helper.
// ============================================================================

import { assemblePrompt } from '../mood/prompt-assembler';
import { cameraSpecKey } from '../mood/decision-table';
import { Prisma } from '@prisma/client';
import { prisma } from '../prisma';
import type {
  AssembledSlotStrategy,
  AssembledStrategy,
  CategoryDnaCard,
  SlotPlanEntry,
} from './types';
import { decideSlotPlan, ProductSlotSignals } from './slot-decision-table';
import { routeModel } from './model-routing';

export interface AssembleStrategyInput {
  productId: string;
  // Short English subject noun for the product, e.g. "leather car air-freshener".
  productSubject: string;
  card: CategoryDnaCard;
  signals?: ProductSlotSignals;
}

// ASCII-only palette guard — keep the English prompt clean; Korean palette prose
// from the DNA card is omitted (mood default applies) rather than leaked in.
function asciiPalette(palette: string | undefined): string | undefined {
  if (!palette) return undefined;
  // eslint-disable-next-line no-control-regex
  return /^[\x00-\x7F]*$/.test(palette) ? palette : undefined;
}

/**
 * Assemble the full per-slot image/SEO strategy for one product. Pure.
 */
export function assembleStrategy(input: AssembleStrategyInput): {
  strategy: AssembledStrategy;
  plan: SlotPlanEntry[];
} {
  const { productId, productSubject, card, signals } = input;
  const plan = decideSlotPlan(card, signals);
  const palette = asciiPalette(card.toneManner?.palette);
  const subject = productSubject.trim() || 'product';

  const slots: AssembledSlotStrategy[] = plan.map((entry) => {
    const assembled = assemblePrompt({
      moodCode: entry.mood,
      product: subject,
      palette,
      categoryTags: [card.categoryCode],
    });
    const route = routeModel(entry, card);
    return {
      slotType: entry.slotType,
      required: entry.required,
      modelRoute: route.model,
      aspect: entry.aspect,
      grounding: route.grounding,
      mood: entry.mood,
      realismLane: entry.realismLane,
      resolvedPrompt: assembled.prompt,
      benchmarkDna: assembled.benchmarkDna,
      cameraKey: cameraSpecKey(assembled.camera),
    };
  });

  return {
    strategy: {
      productId,
      categoryCode: card.categoryCode,
      categoryDnaVersion: card.version,
      slots,
    },
    plan,
  };
}

// ----------------------------------------------------------------------------
// Persistence (opt-in). Writes the SlotPlan row + a draft PromptVersion per
// slot (engine spec §7: prompt versions are immutable; a new edit = new row).
// SlotGeneration is logged later, when a generation actually runs.
// ----------------------------------------------------------------------------

export async function persistStrategy(
  input: AssembleStrategyInput,
  authoredBy = 'engine',
): Promise<{ slotPlanId: string; promptVersionIds: string[] }> {
  const { strategy, plan } = assembleStrategy(input);

  const slotPlan = await prisma.slotPlan.create({
    data: {
      productId: input.productId,
      categoryDnaId: null,
      slots: plan as unknown as Prisma.InputJsonValue,
      version: 1,
    },
    select: { id: true },
  });

  const promptVersionIds: string[] = [];
  for (const slot of strategy.slots) {
    const pv = await prisma.promptVersion.create({
      data: {
        scope: 'slot',
        categoryCode: strategy.categoryCode,
        slotType: slot.slotType,
        templateText: slot.resolvedPrompt,
        variables: { product: input.productSubject } as Prisma.InputJsonValue,
        model: slot.modelRoute,
        groundingDefault: slot.grounding,
        seedPolicy: 'free',
        version: 1,
        status: 'draft',
        authoredBy,
        rationale: `slot=${slot.slotType} mood=${slot.mood} lane=${slot.realismLane}`,
      },
      select: { id: true },
    });
    promptVersionIds.push(pv.id);
  }

  return { slotPlanId: slotPlan.id, promptVersionIds };
}
