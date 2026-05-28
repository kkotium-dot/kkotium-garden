// src/lib/sku-engine.ts
// Server-only SKU generation engine. Shared by the generate-sku route and the
// products POST handler so an empty SKU never reaches the DB (the sku column
// has a unique index, and an empty string '' counts as a single value -> the
// 2nd SKU-less product would collide). Imports prisma, so this module must
// never be pulled into a client bundle.
//
// SKU format:
//   With supplier abbr:    {PLATFORM}-{ABBR}-{SUPPLIER_PRODUCT_NO}  e.g. DMM-HV-39234
//   Without supplier abbr: {PLATFORM}-DIRECT-{SUPPLIER_PRODUCT_NO}  e.g. DMM-DIRECT-39234
//   Fallback (no product no): KKT-{YYMMDD}-{RANDOM6}

import { prisma } from '@/lib/prisma';

export function buildFallbackSku(): string {
  const now = new Date();
  const ymd = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `KKT-${ymd}-${rand}`;
}

export interface GenerateSkuOptions {
  supplierId?: string;
  supplierProductNo?: string;
}

// Build a unique SKU and guarantee it does not collide with an existing row.
// Always returns a non-empty value.
export async function generateUniqueSku(opts: GenerateSkuOptions): Promise<string> {
  const supplierId = String(opts.supplierId ?? '').trim();
  const supplierProductNo = String(opts.supplierProductNo ?? '').trim();

  let base: string;
  if (!supplierProductNo) {
    base = buildFallbackSku();
  } else {
    const supplier = supplierId
      ? await prisma.supplier.findUnique({ where: { id: supplierId } })
      : null;
    const platform = (supplier?.platformCode ?? 'ETC').toUpperCase();
    const abbrPart = supplier?.abbr ? supplier.abbr.toUpperCase() : 'DIRECT';
    base = `${platform}-${abbrPart}-${supplierProductNo.toUpperCase()}`;
  }

  // Ensure uniqueness: append an incrementing suffix on collision.
  let finalSku = base;
  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await prisma.product.findUnique({ where: { sku: finalSku } });
    if (!existing) break;
    attempt += 1;
    finalSku = `${base}-${attempt}`;
    if (attempt > 99) { finalSku = buildFallbackSku(); break; }
  }
  return finalSku;
}
