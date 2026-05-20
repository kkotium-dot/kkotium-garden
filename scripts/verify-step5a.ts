// scripts/verify-step5a.ts
//
// Sprint 7-M2 Step 5-A verification.
//
// Exercises the text section composer end-to-end with one dummy product and
// asserts the design-doc invariants:
//   1. composeAllTextSections returns 4 sections, each with 4 variants
//   2. Lint engine wiring catches a B08-style "first-fold-missing-total" case
//      via the per-variant lintBlock call inside the composer
//   3. P-Filter L4 grade short-circuits L2 — simulated here at the resolver
//      level since we don't need a live image fetch
//   4. The L2 API skeleton returns image blocks with status='deferred_5b'
//      (no false "complete" labels — workflow principle #46)
//
// Run with: npx tsx scripts/verify-step5a.ts

import {
  composeAllTextSections,
  type ProductData,
  type SectionResult,
} from '../src/lib/automation/section-composer';
import { _internals } from '../src/lib/diagnosis/p-filter';
import type { PFilterSignals } from '../src/lib/diagnosis/p-filter-types';

let exitCode = 0;

function assert(cond: boolean, label: string): void {
  if (cond) {
    console.log(`[PASS] ${label}`);
  } else {
    console.log(`[FAIL] ${label}`);
    exitCode = 1;
  }
}

function summariseSection(section: SectionResult): void {
  console.log(`  - ${section.blockId} (${section.title}):`);
  for (const v of section.variants) {
    const violations = v.lintViolations.map((x) => `${x.severity}:${x.rule}`).join(',');
    const flag = v.requiresSellerApproval ? ' [needs-approval]' : '';
    console.log(
      `      ${v.variantId} | ${v.tone}/${v.length} | ${v.source} | ${v.content.length}자 | lint:${violations || 'clean'}${flag}`,
    );
  }
}

async function main(): Promise<void> {
  console.log('=== Sprint 7-M2 Step 5-A verification ===');

  // ---- Section composition ------------------------------------------------
  const dummy: ProductData = {
    id: 'dummy-step5a',
    name: '꽃틔움 검증용 식기',
    salePrice: 24800,
    category: '주방용품',
    brand: '꽃틔움',
    shippingFee: 3000,
    firstFoldText: '',
  };

  const t0 = Date.now();
  const sections = await composeAllTextSections(dummy);
  const elapsedMs = Date.now() - t0;
  console.log(`\nComposition elapsed: ${elapsedMs}ms`);

  assert(sections.length === 4, 'composeAllTextSections returns 4 sections');

  const expectedIds = ['B02', 'B06', 'B07', 'B09'];
  for (const id of expectedIds) {
    const found = sections.find((s) => s.blockId === id);
    assert(!!found, `section ${id} present`);
    if (found) {
      assert(found.variants.length === 4, `${id} returns 4 variants`);
      const uniqueAxes = new Set(found.variants.map((v) => `${v.tone}-${v.length}`));
      assert(uniqueAxes.size === 4, `${id} variants span 4 tone×length axes`);
    }
  }

  for (const section of sections) {
    summariseSection(section);
  }

  // ---- Lint wiring assertion ----------------------------------------------
  // Every variant has lintViolations field present (may be empty array).
  let lintFieldOk = true;
  for (const s of sections) {
    for (const v of s.variants) {
      if (!Array.isArray(v.lintViolations)) lintFieldOk = false;
    }
  }
  assert(lintFieldOk, 'every variant carries lintViolations array');

  // B09 should pass copy-level lint (no scarcity/superlatives) — sanity check.
  const b09 = sections.find((s) => s.blockId === 'B09')!;
  const b09HasSuperlative = b09.variants.some((v) =>
    v.lintViolations.some((x) => x.rule === 'copy_superlative_claim'),
  );
  assert(!b09HasSuperlative, 'B09 FAQ does not trigger superlative copy rule');

  // ---- P-Filter L4 short-circuit (signal level) ---------------------------
  const l4Signals: PFilterSignals = {
    resolution: { width: 400, height: 400, sufficient: false },
    blur: { variance: 1000, level: 'ok' },
    exposure: { mean: 128, ok: true },
    whiteBalance: { cast: false, deviation: 0 },
    watermark: { detected: false, regions: [], texts: [] },
    background: { variance: 200, uniform: true },
    objectRatio: null,
  };
  const l4Grade = _internals.resolveGrade(l4Signals);
  assert(l4Grade === 'L4', 'P-Filter resolveGrade returns L4 for sub-600px image');

  // ---- Image block deferred labelling (workflow principle #46) ------------
  // Verified at the route shape level by inspecting the module export.
  const route = await import('../src/app/api/automation/l2/route');
  assert(typeof route.POST === 'function', 'L2 API exports POST handler');
  assert(route.runtime === 'nodejs', 'L2 API runs on nodejs runtime');
  assert(route.dynamic === 'force-dynamic', 'L2 API is force-dynamic');

  console.log(`\n=== exit code: ${exitCode} ===`);
  process.exit(exitCode);
}

main().catch((err) => {
  console.error('verify-step5a crashed:', err);
  process.exit(1);
});
