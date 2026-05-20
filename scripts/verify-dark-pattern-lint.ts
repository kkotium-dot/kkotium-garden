// scripts/verify-dark-pattern-lint.ts
//
// Sprint 7-M3 Pre-Step 5 verification. Runs the lint engine against four
// dummy products that each trigger a different KFTC rule, and prints the
// resulting violations. Exits 1 if expected violations are missing.

import {
  checkHiddenRenewal,
  checkPriceTransparency,
  checkOptionDefaults,
  checkButtonHierarchy,
  checkCancellationAccess,
  checkNotificationFrequency,
  checkCopyText,
  lintBuildingBlock,
  lintProduct,
  shouldBlockAutomation,
  type ProductInput,
} from '../src/lib/compliance/dark-pattern-lint';

function logResult(label: string, expectedRules: string[], actual: { violations: { rule: string }[] }) {
  const found = actual.violations.map((v) => v.rule);
  const missing = expectedRules.filter((r) => !found.includes(r));
  const status = missing.length === 0 ? 'PASS' : 'FAIL';
  console.log(`[${status}] ${label}`);
  console.log(`        expected: ${expectedRules.join(', ')}`);
  console.log(`        found:    ${found.join(', ') || '(none)'}`);
  if (missing.length > 0) {
    console.log(`        missing:  ${missing.join(', ')}`);
    process.exitCode = 1;
  }
}

const baseProduct: ProductInput = {
  salePrice: 12000,
  shippingFee: 0,
  optionMaxExtra: 0,
  firstFoldText: '꽃 한 다발 12000원',
  optionsShowExtraInListing: true,
  hasRecurringPayment: false,
  options: [],
  buttons: [
    { role: 'primary_purchase', area: 5000, contrast: 0.9, scrollDepth: 0.3 },
    { role: 'cancel_refund_info', area: 4000, contrast: 0.8, scrollDepth: 0.35 },
  ],
};

// --- Case 1: Rule 2 (price transparency) violations ----------------------------
const productA: ProductInput = {
  ...baseProduct,
  salePrice: 12000,
  shippingFee: 3000,
  optionMaxExtra: 5000,
  firstFoldText: '꽃 한 다발 특가',
  optionsShowExtraInListing: false,
};
logResult(
  'Case A — sequential price reveal (rule 2)',
  ['total_cost_not_shown_in_first_fold', 'shipping_fee_hidden', 'option_extra_revealed_too_late'],
  checkPriceTransparency(productA),
);

// --- Case 2: Rule 3 (pre-selected paid option) ---------------------------------
const productB: ProductInput = {
  ...baseProduct,
  options: [
    { id: 'addon-1', extraPrice: 2000, defaultSelected: true },
    { id: 'addon-2', extraPrice: 0, defaultSelected: true },
  ],
};
logResult(
  'Case B — pre-selected paid option (rule 3)',
  ['option_auto_selected_with_extra_cost'],
  checkOptionDefaults(productB),
);

// --- Case 3: Rule 4 (button hierarchy) -----------------------------------------
const buttonsC = [
  { role: 'primary_purchase' as const, area: 9000, contrast: 1.0, scrollDepth: 0.3 },
  { role: 'cancel_refund_info' as const, area: 800, contrast: 0.3, scrollDepth: 0.95 },
];
logResult(
  'Case C — wrong visual hierarchy (rule 4)',
  ['cancel_button_visually_suppressed', 'cancel_button_hidden_in_footer'],
  checkButtonHierarchy(buttonsC),
);

// Missing cancel button
logResult(
  'Case C2 — cancel button missing (rule 4)',
  ['cancel_refund_button_missing'],
  checkButtonHierarchy([{ role: 'primary_purchase', area: 5000, contrast: 0.9 }]),
);

// --- Case 4: Rule 1 (hidden renewal) -------------------------------------------
logResult(
  'Case D — hidden renewal (rule 1)',
  ['recurring_payment_disclosure_missing'],
  checkHiddenRenewal({ ...baseProduct, hasRecurringPayment: true }),
);

// --- Case 5: Rule 5 (cancellation obstruction) ---------------------------------
logResult(
  'Case E — cancellation obstruction (rule 5)',
  ['withdrawal_too_deep', 'refund_info_inaccessible'],
  checkCancellationAccess({ withdrawalClickDepth: 5, refundAccessibleFromProduct: false }),
);

// --- Case 6: Rule 6 (repeated interference) ------------------------------------
logResult(
  'Case F — repeated interference (rule 6)',
  ['notification_repeated_in_session', 'notification_daily_limit_exceeded'],
  checkNotificationFrequency({
    userId: 'u1',
    channelId: 'c1',
    kind: 'low_stock',
    sessionCount: 2,
    dailyCount: 4,
  }),
);

// --- Case 7: Copy text lint ----------------------------------------------------
logResult(
  'Case G — copy text scarcity / superlative / anchor-discount',
  ['copy_scarcity_pattern', 'copy_anchor_discount', 'copy_superlative_claim'],
  checkCopyText('마감 임박! 원래 가격 대비 50% 즉시 할인 최저가 1위'),
);

// --- Case 8: lintBuildingBlock matrix dispatch ---------------------------------
const b08 = lintBuildingBlock('B08', { product: productA });
logResult(
  'Case H — B08 building block (price + option matrix)',
  ['total_cost_not_shown_in_first_fold', 'shipping_fee_hidden', 'option_extra_revealed_too_late'],
  b08,
);

// --- Case 9: lintProduct severity routing --------------------------------------
const fullResult = lintProduct({ product: productA });
console.log(`[INFO] lintProduct(productA) shouldBlockAutomation = ${shouldBlockAutomation(fullResult)} (expected true)`);
if (!shouldBlockAutomation(fullResult)) {
  console.log('        FAIL: expected high-severity block');
  process.exitCode = 1;
}

if (process.exitCode === 1) {
  console.log('\n❌ Lint verification failed.');
} else {
  console.log('\n✅ All lint cases passed.');
}
