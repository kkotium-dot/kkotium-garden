// src/lib/automation/section-renderers/types.ts
//
// Sprint 7-M2 Phase 1 (v3.1 FINAL Smart Asset Workflow) — shared section
// renderer types + helpers.
//
// Each section renderer takes a SkeletonSpec + a SectionSpec + a runtime
// ProductContext and produces a PNG Buffer at the canonical 860px width
// matching the section's declared height. section-builder.ts stacks these
// vertically into the final detail page.

import type { SkeletonSpec, SectionSpec } from '../layout-skeletons';

export interface SectionRenderContext {
  /** Required: product display name. */
  productName: string;
  /** Sale price in KRW. */
  salePrice?: number;
  /** Supplier price in KRW (used for fair-trade margin disclosure). */
  supplierPrice?: number;
  /** Free-text category label. */
  category?: string;
  /** Source product image URL (used as hero or solution closeup). */
  sourceImageUrl: string;
  /** Optional lifestyle backdrop / scene URL. */
  lifestyleAssetUrl?: string;
  /** Optional short context phrase like "4종 세트". */
  highlight?: string;
  /** Optional brand or store name for hero badging. */
  brandName?: string;
  /** Verified-from-DB facts used to ground spec/story copy generators.
   *  When present, generators MUST treat these as the only allowed source of
   *  factual claims; unverified rows must use a placeholder or be omitted.
   *  This is the #46 anti-hallucination plumbing (2026-05-31). */
  groundedFacts?: GroundedFacts;
}

/** Verified facts read from Product + crawl_logs + tone mapping. Every field
 *  is optional — the generators MUST treat absence as "unknown" and fall back
 *  to a deterministic placeholder, NEVER to a fabricated value. */
export interface GroundedFacts {
  optionCount?: number;
  optionName?: string;
  optionValues?: string[];
  originCountry?: string | null;
  distributorLabel?: string;
  categoryLeaf?: string;
  toneCategoryGroup?: string;
  toneBase?: string;
}

export interface SectionRenderResult {
  /** PNG Buffer at 860 × section.height. */
  buffer: Buffer;
  /** Map of slot name → final copy string used in the section. */
  copy: Record<string, string>;
  /** Section id (matches SectionSpec.id, useful for caller logging). */
  sectionId: string;
  /** Height in pixels (matches section.height). */
  height: number;
  /** True when one or more copy slots fell back to deterministic templates
   *  (Groq unavailable or dark-pattern filter tripped twice). */
  copyFiltered: boolean;
}

export type SectionRenderer = (
  spec: SkeletonSpec,
  section: SectionSpec,
  ctx: SectionRenderContext,
) => Promise<SectionRenderResult>;

// ---------------------------------------------------------------------------
// Background color token resolver
//
// SkeletonSpec section.bgColorToken values are abstract tokens. We resolve
// them against the skeleton's three colorTokens (primary, secondary, accent)
// so each renderer can stay agnostic of the brand palette. Unknown tokens
// fall back to white — never throw, always render.
// ---------------------------------------------------------------------------

export function resolveBgColor(
  spec: SkeletonSpec,
  token: string | undefined,
): string {
  if (!token) return '#FFFFFF';
  switch (token) {
    case 'neutral_0':
      return '#FFFFFF';
    case 'neutral_50':
      return '#FAFAFA';
    case 'neutral_100':
      return spec.colorTokens.secondary;
    case 'neutral_900':
      return spec.colorTokens.accent;
    case 'warm_50':
    case 'warm_100':
    case 'sage_50':
    case 'sepia_100':
      return spec.colorTokens.secondary;
    case 'accent_100':
      return spec.colorTokens.primary;
    default:
      return spec.colorTokens.secondary || '#FFFFFF';
  }
}

// ---------------------------------------------------------------------------
// Width invariant — every section renderer must output 860px width
// ---------------------------------------------------------------------------

export const CANONICAL_WIDTH = 860;
