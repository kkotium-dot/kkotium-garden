// src/lib/storage/variant-coverage.ts
// ============================================================================
// VARIANT <-> COMPOSITE coverage (#62 P2). An option product (scent/color/size)
// needs a representative composite PER active variant. Desktop audit found the
// whole binding layer absent (asset_registry had no variant column; all 12 명화
// composites carried no scent identifier). This computes, per product, which
// in-stock variants still lack a bound composite — the basis for the
// variant_composite intervention card.
//
// Truth source for active variants = Product.options jsonb (stockQuantity per
// variant), NOT the product_options table (which carries a stale Cotton row).
// This is the authoritative side of the 3-representation option drift
// (optionValues=3 / options jsonb=4 w/ Cotton stock 0 / product_options=4
// ON_SALE); the full 3-way reconcile is a separate task. Denominator = stock>0.
//
// covered = distinct non-null `variant` among LIVE composite registry rows
// (registry-only orphans excluded via the live storage listing). Product-
// agnostic (#55); listing + DB only (no image downloads).
// ============================================================================

import { prisma } from '@/lib/prisma';
import { listProductAssets } from './automation-storage';
import {
  setJobIntervention,
  clearJobIntervention,
  buildVariantCompositePayload,
  INTERVENTION_VARIANT_COMPOSITE,
} from '@/lib/jobs/intervention';
import { PRODUCT_COMPOSITE } from '@/lib/jobs/job-type-routing';

export interface VariantCoverage {
  productId: string;
  /** True when the product has at least one in-stock option variant. */
  hasOptions: boolean;
  /** In-stock variant values (denominator). */
  active: string[];
  /** Active variants that have a bound, live composite (intersection). */
  covered: string[];
  /** Active variants still missing a bound composite (active \ covered). */
  missing: string[];
  /** covered / active, in [0,1]. 1 when no options. */
  ratio: number;
  /** True when every active variant is covered (or there are no options). */
  reconciled: boolean;
}

/** Active (in-stock) variant values from Product.options jsonb. */
function activeVariantsFromOptions(options: unknown): string[] {
  if (!Array.isArray(options)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const o of options as Array<Record<string, unknown>>) {
    const stock = Number(o?.stockQuantity ?? o?.stock ?? 0);
    if (!(stock > 0)) continue;
    const v = String(o?.optionValue1 ?? (o?.values as unknown[])?.[0] ?? o?.value1 ?? '').trim();
    if (!v || seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
}

export async function computeVariantCoverage(productId: string): Promise<VariantCoverage> {
  const product = (await prisma.product.findUnique({
    where: { id: productId },
    select: { hasOptions: true, options: true },
  })) as { hasOptions: boolean | null; options: unknown } | null;

  const active = activeVariantsFromOptions(product?.options);
  const hasOptions = !!product?.hasOptions && active.length > 0;

  let covered: string[] = [];
  if (hasOptions) {
    const rows = await prisma.assetRegistry
      .findMany({
        where: { productId, stage: 'composite', variant: { not: null } },
        select: { variant: true, path: true },
      })
      .catch(() => [] as Array<{ variant: string | null; path: string }>);
    if (rows.length) {
      // Exclude registry-only orphans: a bound row whose file is gone does not
      // count as covered.
      const live = new Set((await listProductAssets(productId)).map((e) => e.path));
      const set = new Set<string>();
      for (const r of rows) {
        const v = (r.variant ?? '').trim();
        if (v && live.has(r.path)) set.add(v);
      }
      covered = [...set];
    }
  }

  const coveredSet = new Set(covered);
  const missing = active.filter((v) => !coveredSet.has(v));
  const ratio = active.length ? (active.length - missing.length) / active.length : 1;
  return {
    productId,
    hasOptions,
    active,
    covered,
    missing,
    ratio,
    reconciled: !hasOptions || missing.length === 0,
  };
}

/**
 * Seed/clear the variant_composite intervention card from live coverage (#62 P2).
 * Seeds when an option product has < 100% coverage; clears at 100% (or no
 * options). Best-effort; never blocks publish (#56). Returns the coverage.
 */
export async function syncVariantCompositeCard(productId: string): Promise<VariantCoverage> {
  const cov = await computeVariantCoverage(productId);
  if (cov.reconciled) {
    await clearJobIntervention(productId, INTERVENTION_VARIANT_COMPOSITE);
  } else {
    await setJobIntervention({
      productId,
      jobType: PRODUCT_COMPOSITE,
      type: INTERVENTION_VARIANT_COMPOSITE,
      payload: buildVariantCompositePayload({
        productId,
        active: cov.active,
        covered: cov.covered,
        missing: cov.missing,
        ratio: cov.ratio,
        checkedAt: new Date().toISOString(),
      }),
      tool: 'sharp',
      matchInterventionType: true,
    });
  }
  return cov;
}
