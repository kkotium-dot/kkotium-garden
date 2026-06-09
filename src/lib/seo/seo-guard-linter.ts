// src/lib/seo/seo-guard-linter.ts
//
// SEO guard linter (Phase B-2) — ALWAYS runs, INDEPENDENT of the concept
// preset (CONCEPT_PRESET_SYSTEM.md §7 "SEO orthogonality"; ADAPTIVE §2/§5-D). A product's
// visual mood (preset) must never weaken its search compliance, so this linter
// takes NO preset input and is composed of the three fixed guards:
//   1. product name <= 50 chars + no banned/abuse terms (product-name-checker)
//   2. representative image = 1:1 white background (naver-normalize pixel guard,
//      result injected by the caller that has the buffer — pure here, #46)
//   3. category accuracy = 8-digit Naver leaf code present
//
// Pure + synchronous: no image fetch, no DB. The white-bg PIXEL check is async
// (Sharp) and lives in the calling route; it passes its boolean result in. When
// not provided the check is reported as 'manual' rather than fabricated (#46).
// All `detail` strings are English (machine-readable); any Korean UI label is
// mapped by the consumer via i18n (CLAUDE.md §3-1).

import { checkProductName } from '@/lib/product-name-checker';

export type SeoCheckStatus = 'pass' | 'warn' | 'fail' | 'manual';

export type SeoCheckId =
  | 'product_name_50'
  | 'main_image_white_bg'
  | 'category_accuracy';

export interface SeoCheck {
  id: SeoCheckId;
  status: SeoCheckStatus;
  detail: string;
}

export interface SeoGuardResult {
  /** true when no check is 'fail' (manual/warn do not block, they surface). */
  ok: boolean;
  /** Documents that this linter never reads the preset (orthogonality proof). */
  orthogonalToPreset: true;
  checks: SeoCheck[];
}

export interface SeoGuardInput {
  productName: string;
  naverCategoryCode?: string | null;
  mainImage?: string | null;
  /** SEO keywords (for name inclusion heuristics inside checkProductName). */
  keywords?: string[];
  /**
   * Precomputed white-bg pixel result from naver-normalize.assertWhiteBackground
   * (the calling route runs Sharp). true=white, false=not white, null/undefined=
   * not checked -> reported as 'manual' (no fabrication, #46).
   */
  mainImageWhiteBgVerified?: boolean | null;
}

const NAVER_LEAF_CODE = /^\d{8}$/;

function lintProductName(input: SeoGuardInput): SeoCheck {
  const name = (input.productName ?? '').trim();
  if (!name) {
    return { id: 'product_name_50', status: 'fail', detail: 'product name is empty' };
  }
  const r = checkProductName(name, { keywords: input.keywords });
  const errors = r.issues.filter((i) => i.severity === 'error').length;
  const warnings = r.issues.filter((i) => i.severity === 'warning').length;
  const overLimit = r.charCount > 50;
  const status: SeoCheckStatus = overLimit || errors > 0 ? 'fail' : warnings > 0 ? 'warn' : 'pass';
  return {
    id: 'product_name_50',
    status,
    detail: `length ${r.charCount}/50, grade ${r.grade}, errors ${errors}, warnings ${warnings}` +
      (overLimit ? ' (over 50-char limit)' : ''),
  };
}

function lintMainImageWhiteBg(input: SeoGuardInput): SeoCheck {
  if (!input.mainImage) {
    return { id: 'main_image_white_bg', status: 'fail', detail: 'representative image missing' };
  }
  if (input.mainImageWhiteBgVerified === true) {
    return { id: 'main_image_white_bg', status: 'pass', detail: 'representative background verified white/neutral' };
  }
  if (input.mainImageWhiteBgVerified === false) {
    return { id: 'main_image_white_bg', status: 'fail', detail: 'representative background is not white/neutral (cutout needed)' };
  }
  return {
    id: 'main_image_white_bg',
    status: 'manual',
    detail: 'white-bg pixel check deferred to naver-normalize; verify representative is a 1:1 white-bg cutout',
  };
}

function lintCategoryAccuracy(input: SeoGuardInput): SeoCheck {
  const code = (input.naverCategoryCode ?? '').trim();
  if (!code) {
    return { id: 'category_accuracy', status: 'fail', detail: 'naver category code missing' };
  }
  if (NAVER_LEAF_CODE.test(code)) {
    return { id: 'category_accuracy', status: 'pass', detail: `naver leaf code ${code} (8-digit)` };
  }
  return {
    id: 'category_accuracy',
    status: 'warn',
    detail: `category code "${code}" is not an 8-digit numeric leaf code`,
  };
}

/**
 * Run the three preset-independent SEO guards. `ok` is false only when a check
 * outright FAILS — 'warn'/'manual' surface for operator attention but do not
 * hard-block (the publish gate decides). Never reads the concept preset.
 */
export function lintSeoGuards(input: SeoGuardInput): SeoGuardResult {
  const checks: SeoCheck[] = [
    lintProductName(input),
    lintMainImageWhiteBg(input),
    lintCategoryAccuracy(input),
  ];
  return {
    ok: checks.every((c) => c.status !== 'fail'),
    orthogonalToPreset: true,
    checks,
  };
}
