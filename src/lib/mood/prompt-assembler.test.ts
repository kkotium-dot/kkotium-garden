// Mood-Camera prompt-assembler unit test (2026-06-16, session8).
// No test framework in this repo — run standalone: `npx tsx src/lib/mood/prompt-assembler.test.ts`
// Exits non-zero on the first failed assertion. Covers authority §3/§4:
//   - all 6 axes assemble (subject + camera + grade + exclusion)
//   - exclusion is POSITIVE prose; no negativePrompt field is ever produced (#86)
//   - camera variety guard: 6-mood batch passes, single-default batch fails (#84)

import assert from 'node:assert/strict';
import { assemblePrompt } from './prompt-assembler';
import { evaluateGuards } from './guards';
import { MOOD_AXES, MOOD_CODES, EXCLUSION_BLOCK, FIXED_GRADE_BLOCK } from './spec-data';
import type { AssembledPrompt } from './types';

let passed = 0;
function check(name: string, fn: () => void) {
  fn();
  passed += 1;
  // eslint-disable-next-line no-console
  console.log(`  ok — ${name}`);
}

// 1) Every axis assembles with all four parts and reflects its own camera.
for (const code of MOOD_CODES) {
  check(`assemble ${code}`, () => {
    const a = assemblePrompt({ moodCode: code, product: 'ceramic diffuser', palette: 'warm beige' });
    assert.ok(a.prompt.length > 80, 'prompt should be substantial');
    assert.ok(a.prompt.includes('ceramic diffuser'), 'product subject present');
    assert.ok(a.prompt.includes(MOOD_AXES[code].camera.cameraArchetype), 'mood-specific camera present');
    assert.ok(a.prompt.includes(MOOD_AXES[code].camera.lens), 'mood-specific lens present');
    assert.ok(a.prompt.includes('unified collection grade'), 'fixed grade appended');
    assert.ok(a.prompt.includes('realistic photograph only'), 'positive exclusion appended');
  });
}

// 2) Exclusion is positive prose; the assembled object never carries a
//    negativePrompt field, and the literal guard flag is false (#86).
check('exclusion is positive, no negativePrompt field', () => {
  const a = assemblePrompt({ moodCode: 'M4', product: 'scented candle' });
  assert.equal(a.usesNegativePromptField, false);
  assert.ok(!('negativePrompt' in (a as unknown as Record<string, unknown>)), 'no negativePrompt key on result');
  assert.ok(!/negative\s*prompt/i.test(a.prompt), 'prompt does not mention a negative prompt');
  assert.ok(a.prompt.includes(EXCLUSION_BLOCK), 'full positive exclusion block present');
  assert.ok(a.prompt.includes(FIXED_GRADE_BLOCK), 'full fixed grade present');
});

// 3) Defaults applied when product/palette missing (no per-product crash #55).
// Defect A (#62): an empty palette falls back to the MOOD'S English palette
// descriptor, never the bare "natural" default that dropped per-variant palette.
check('defaults applied for empty inputs', () => {
  const a = assemblePrompt({ moodCode: 'M1', product: '' });
  assert.ok(a.prompt.includes('product'), 'falls back to generic product noun');
  assert.ok(a.prompt.includes(MOOD_AXES.M1.palette), 'falls back to the mood palette, not "natural"');
  assert.ok(!a.prompt.includes('in natural'), 'never emits the bare "in natural" default');
});

// 4) Camera-variety guard: a full 6-mood batch passes; a single-default batch
//    (one mood repeated) fails — the "all Sony" failure mode (#84).
check('camera variety guard', () => {
  const batch: AssembledPrompt[] = MOOD_CODES.map((c) =>
    assemblePrompt({ moodCode: c, product: 'vase' }),
  );
  const varied = evaluateGuards({ batch, referenceCleared: true, settingsVerified: true });
  assert.equal(varied.cameraVarietyApplied, true, '6-mood batch is varied');
  assert.equal(varied.exclusionsPresent, true);
  assert.equal(varied.benchmarkDnaSet, true);
  assert.equal(varied.referenceCleared, true);
  assert.equal(varied.settingsVerified, true);

  const single: AssembledPrompt[] = [0, 1, 2, 3].map(() =>
    assemblePrompt({ moodCode: 'M2', product: 'vase' }),
  );
  const flat = evaluateGuards({ batch: single });
  assert.equal(flat.cameraVarietyApplied, false, 'single-default batch fails variety');
  assert.equal(flat.referenceCleared, false, 'unconfirmed reference defaults false');
  assert.equal(flat.settingsVerified, false, 'unconfirmed settings default false');
});

// eslint-disable-next-line no-console
console.log(`\nAll ${passed} mood-camera assertions passed.`);
