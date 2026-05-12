// src/lib/automation/section-renderers/strings.ts
//
// Sprint 7-M2 ko.json migration (principle 35) — typed loader for Korean
// fallback strings. All static Korean copy lives in strings.ko.json so that
// section-copy.ts and individual renderer files can stay code-comment-only
// (principle 29 c) while still surfacing user-facing Korean copy.
//
// Lookup pattern in callers:
//   import { STRINGS, fill } from './strings';
//   const headline = STRINGS.solution.headline;
//   const caption  = fill(STRINGS.story.paragraphSuffix, { head: '꽃틔움' });
//
// The dict is treated as readonly — callers must not mutate.

import dict from './strings.ko.json';

export const STRINGS = dict;

export type StringsRoot = typeof STRINGS;

/**
 * Interpolate `{token}` placeholders in a template string with values from
 * `vars`. Missing tokens are left as `{token}` so missing context surfaces
 * visibly at runtime instead of silently rendering "undefined".
 */
export function fill(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const v = vars[key];
    return typeof v === 'string' ? v : `{${key}}`;
  });
}

/**
 * Convenience accessor for the spec.rows[] fallback structure. Builds the
 * 5-row spec fallback by combining static label/value pairs with two
 * caller-provided context values (highlight + category).
 */
export function buildSpecRows(opts: {
  highlight?: string;
  category?: string;
}): { label: string; value: string }[] {
  return [
    { label: STRINGS.spec.labels.composition, value: opts.highlight ?? STRINGS.common.singleItem },
    { label: STRINGS.spec.labels.category, value: opts.category ?? STRINGS.common.categoryFallback },
    { label: STRINGS.spec.labels.origin, value: STRINGS.common.detailsReference },
    { label: STRINGS.spec.labels.manufacturer, value: STRINGS.common.detailsReference },
    { label: STRINGS.spec.labels.support, value: STRINGS.spec.values.supportChannel },
  ];
}
