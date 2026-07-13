// src/lib/inventory-mapping.ts
// ============================================================================
// STOCK_VISIBILITY_DISCORD_CONTENT_DIAGNOSIS_2026-07-13 §1-B — supplier_product_code
// auto-mapping for products linked via Naver import (PL-1) that never went
// through the Domeggook crawl flow, so they never got a code (the "플라티코"
// gap: linked on Naver, untracked on Domeggook).
//
// Best-effort, product-agnostic (#62), honest (#231): an exact product-name
// match against crawl_logs is the only auto-fill path — no fuzzy/AI guessing
// that could silently attach the wrong supplier product. A miss just means
// the operator connects the code manually (UI fallback), not a broken match.
// ============================================================================

import { prisma } from '@/lib/prisma';
import { parseDomeProductNo } from '@/lib/sources/parse-dome-no';

export interface SupplierCodeMapResult {
  matched: boolean;
  code: string | null;
  source: 'already_set' | 'crawl_log_match' | 'none';
}

/**
 * Attempt to fill Product.supplier_product_code from a same-name crawl_logs
 * entry. No-op (already_set) if the product already carries a code. Returns
 * matched:false/source:'none' on a miss — caller falls back to manual input.
 */
export async function attemptAutoMapSupplierCode(productId: string): Promise<SupplierCodeMapResult> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, name: true, supplier_product_code: true },
  });
  if (!product) return { matched: false, code: null, source: 'none' };
  if (product.supplier_product_code) {
    return { matched: true, code: product.supplier_product_code, source: 'already_set' };
  }

  const name = product.name.trim();
  if (!name) return { matched: false, code: null, source: 'none' };

  const crawlMatch = await (prisma as any).crawlLog.findFirst({
    where: { name },
    orderBy: { crawledAt: 'desc' },
    select: { url: true },
  }).catch(() => null);

  const code = crawlMatch ? parseDomeProductNo(crawlMatch.url) : null;
  if (!code) return { matched: false, code: null, source: 'none' };

  await prisma.product.update({
    where: { id: productId },
    data: { supplier_product_code: code },
  }).catch(() => null);

  return { matched: true, code, source: 'crawl_log_match' };
}

/**
 * Manually attach a supplier code (operator-entered). Overwrites any existing
 * value — an explicit correction always wins over a stale auto-match.
 */
export async function setSupplierCode(productId: string, code: string): Promise<void> {
  const trimmed = code.trim();
  await prisma.product.update({
    where: { id: productId },
    data: { supplier_product_code: trimmed || null },
  });
}
