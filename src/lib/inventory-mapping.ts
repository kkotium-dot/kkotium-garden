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
import { parseSupplierCodeInput } from '@/lib/sources/parse-supplier-code';

export interface SupplierCodeMapResult {
  matched: boolean;
  code: string | null;
  source: 'already_set' | 'crawl_log_match' | 'none';
}

export class SupplierCodeParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SupplierCodeParseError';
  }
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

  // crawl_logs is exclusively Domeggook/Domemae crawl history (#62).
  await prisma.product.update({
    where: { id: productId },
    data: { supplier_product_code: code, supplier_platform_code: 'DMM' },
  }).catch(() => null);

  return { matched: true, code, source: 'crawl_log_match' };
}

export interface SetSupplierCodeResult {
  code: string;
  platformCode: 'DMM' | 'OWC' | null;
  originalUrl: string | null;
}

/**
 * Manually attach a supplier code (operator-entered). Accepts EITHER a bare
 * code OR a full product-page URL from any registered platform (see
 * parse-supplier-code.ts) — the operator now sources from multiple wholesale
 * sites, not just Domeggook, so raw-URL paste must be supported directly
 * rather than requiring the operator to extract the number by hand.
 *
 * Overwrites any existing value — an explicit correction always wins over a
 * stale auto-match. Throws SupplierCodeParseError when the input is neither
 * a bare code nor a recognized platform URL (#231 — refuse rather than guess
 * a code out of unrecognized text, which could silently mistrack the wrong
 * product's inventory).
 */
export async function setSupplierCode(productId: string, input: string): Promise<SetSupplierCodeResult> {
  const trimmed = input.trim();
  if (!trimmed) {
    await prisma.product.update({
      where: { id: productId },
      data: { supplier_product_code: null, supplier_platform_code: null },
    });
    return { code: '', platformCode: null, originalUrl: null };
  }

  const parsed = parseSupplierCodeInput(trimmed);
  if (!parsed.code) {
    throw new SupplierCodeParseError(
      '상품 코드나 상품 페이지 링크를 알아볼 수 없어요. 도매매/오너클랜 상품 페이지 URL을 그대로 붙여넣거나, 상품번호만 입력해 주세요.',
    );
  }

  await prisma.product.update({
    where: { id: productId },
    data: {
      supplier_product_code: parsed.code,
      supplier_platform_code: parsed.platformCode,
      ...(parsed.originalUrl ? { source_detail_url: parsed.originalUrl } : {}),
    },
  });

  return { code: parsed.code, platformCode: parsed.platformCode, originalUrl: parsed.originalUrl };
}
