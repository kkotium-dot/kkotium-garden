// Engine Stage 1 unit test (2026-06-17, session8). No test framework in this
// repo — run standalone: `npx tsx src/lib/engine/strategy-assembler.test.ts`.
// Exits non-zero on the first failed assertion. Covers handoff §5:
//   - slot decision table (DNA mandatory + product-attribute rows + low-involve)
//   - product-signal derivation
//   - strategy assembler (pure): per-slot prompt + model + aspect + grounding
//   - #86: no negativePrompt is ever produced
//   - #84: hero is local cutout; representative aspect is 1:1; rest 4:5

import assert from 'node:assert/strict';
import { decideSlotPlan, deriveProductSignals } from './slot-decision-table';
import { assembleStrategy } from './strategy-assembler';
import type { CategoryDnaCard } from './types';
import seed from './seeds/category-dna-50014980.json';

const card = seed as unknown as CategoryDnaCard;

let passed = 0;
function check(name: string, fn: () => void) {
  fn();
  passed += 1;
  // eslint-disable-next-line no-console
  console.log(`  ok — ${name}`);
}

// --- decision table ---------------------------------------------------------

check('decision: hero is first and required', () => {
  const plan = decideSlotPlan(card);
  assert.equal(plan[0].slotType, 'hero');
  assert.equal(plan[0].required, true);
  assert.equal(plan[0].aspect, '1:1');
});

check('decision: DNA mandatory slots are required', () => {
  const plan = decideSlotPlan(card);
  for (const slot of ['scent_note', 'use_install', 'trust'] as const) {
    const e = plan.find((p) => p.slotType === slot);
    assert.ok(e, `missing ${slot}`);
    assert.equal(e!.required, true, `${slot} should be required by DNA`);
  }
});

check('decision: full 9-slot sequence honored from DNA', () => {
  const plan = decideSlotPlan(card);
  assert.equal(plan.length, 9);
  assert.equal(plan[plan.length - 1].slotType, 'cta');
});

check('decision: size-uncertain forces size_duration', () => {
  const plan = decideSlotPlan(card, { sizeUncertain: true });
  assert.equal(plan.find((p) => p.slotType === 'size_duration')!.required, true);
});

check('decision: low-involvement shortens the arc (drops optional)', () => {
  const full = decideSlotPlan(card);
  const lean = decideSlotPlan(card, { lowInvolvement: true });
  assert.ok(lean.length < full.length, 'lean plan should be shorter');
  // structural anchors + DNA-mandatory survive
  for (const slot of ['hero', 'cta', 'scent_note', 'use_install', 'trust'] as const) {
    assert.ok(lean.find((p) => p.slotType === slot), `${slot} must survive`);
  }
  // a non-required optional (gift) is dropped
  assert.ok(!lean.find((p) => p.slotType === 'gift'), 'gift should drop');
});

// --- signal derivation ------------------------------------------------------

check('derive: gift/premium category flips giftBiased', () => {
  const s = deriveProductSignals('자동차용품 > 차량용방향제', '명품 송풍구 디퓨저 선물');
  assert.equal(s.giftBiased, true);
});

check('derive: food category flips trustSensitive', () => {
  const s = deriveProductSignals('식품 > 건강식품', '유기농 견과');
  assert.equal(s.trustSensitive, true);
});

// --- strategy assembler -----------------------------------------------------

check('assemble: every slot gets a non-empty resolved prompt', () => {
  const { strategy } = assembleStrategy({
    productId: 'test-prod',
    productSubject: 'leather car air-freshener',
    card,
  });
  assert.equal(strategy.slots.length, 9);
  for (const s of strategy.slots) {
    assert.ok(s.resolvedPrompt.length > 20, `${s.slotType} prompt too short`);
    assert.ok(s.cameraKey.length > 0);
  }
});

check('assemble: #86 no negativePrompt prose leaks a negativePrompt field', () => {
  const { strategy } = assembleStrategy({
    productId: 'test-prod',
    productSubject: 'leather car air-freshener',
    card,
  });
  for (const s of strategy.slots) {
    assert.ok(
      !/negativePrompt/i.test(s.resolvedPrompt),
      `${s.slotType} must not contain a negativePrompt field`,
    );
  }
});

check('assemble: hero routes to local cutout @ 1:1, others composite @ 4:5', () => {
  const { strategy } = assembleStrategy({
    productId: 'test-prod',
    productSubject: 'leather car air-freshener',
    card,
  });
  const hero = strategy.slots.find((s) => s.slotType === 'hero')!;
  assert.equal(hero.modelRoute, 'cutout');
  assert.equal(hero.aspect, '1:1');
  for (const s of strategy.slots) {
    if (s.slotType !== 'hero') assert.equal(s.aspect, '4:5', `${s.slotType} aspect`);
  }
});

check('assemble: scent_note (mandatory) is a Firefly composite slot', () => {
  const { strategy } = assembleStrategy({
    productId: 'test-prod',
    productSubject: 'leather car air-freshener',
    card,
  });
  const scent = strategy.slots.find((s) => s.slotType === 'scent_note')!;
  assert.equal(scent.required, true);
  assert.equal(scent.modelRoute, 'firefly_native');
  assert.equal(scent.realismLane, 'photoreal');
});

// C6 (#107): composite slots carry the reference-composite descriptor + model
// recommendation; the hero (local cutout) carries none. Every slot prompt also
// carries the REALISM-CAMERA-BLOCK directive.
check('assemble: C6 reference-composite descriptor + realism block', () => {
  const { strategy } = assembleStrategy({
    productId: 'test-prod',
    productSubject: 'leather car air-freshener',
    card,
  });
  const hero = strategy.slots.find((s) => s.slotType === 'hero')!;
  assert.equal(hero.composite, null, 'hero (local cutout) has no composite descriptor');
  const scent = strategy.slots.find((s) => s.slotType === 'scent_note')!;
  assert.ok(scent.composite, 'composite slot carries a descriptor');
  assert.equal(scent.composite!.method, 'firefly_reference');
  assert.equal(scent.composite!.referenceRequired, true);
  assert.equal(scent.composite!.fallback, 'local_paste');
  assert.equal(scent.composite!.recommendedModel, scent.modelRoute);
  for (const s of strategy.slots) {
    assert.ok(
      s.resolvedPrompt.includes('photorealistic editorial product photography'),
      `${s.slotType} carries the REALISM-CAMERA-BLOCK`,
    );
  }
});

// eslint-disable-next-line no-console
console.log(`\nengine strategy-assembler: ${passed} checks passed`);
