// src/lib/sources/crawl-option-mapper.ts
//
// Maps crawled option arrays (crawl_logs.options) onto BOTH option stores so a
// promoted product is consistent end-to-end:
//
//   1. Product columns  (hasOptions / optionName / optionType / optionValues /
//      options)  — read by the publish-readiness gate
//      (src/lib/automation/publish-readiness.ts: hasOptions → optionName
//      non-empty string + options non-empty array).
//   2. product_options row (option_type / option_names / option_rows) — read by
//      buildOptionInfo (src/lib/naver/product-builder.ts) for the actual Naver
//      registration payload (optionCombinations).
//
// Root cause this fixes (HANDOFF_crawl_option_mapping_fix_2026-06-03.md): the
// crawl_logs → Product promotion dropped options entirely, so option products
// shipped with hasOptions=false and no product_options row. Both stores MUST be
// filled — filling only one yields "gate GREEN but options missing at publish".

import type { CrawledOption } from './source-adapter';

/**
 * Default option-axis label. Domeggook's selectOpt only carries option VALUE
 * names (e.g. "레몬유칼립"), never the axis/group name (e.g. "향"), so the
 * promotion step has no real axis name to use. We use a neutral default rather
 * than fabricating a specific axis (#46 — no invented data). Operators can
 * rename the axis later in the product editor.
 */
export const DEFAULT_OPTION_AXIS = '옵션';

/** Naver combination option type literal (Product.optionType / option_type). */
export const COMBINATION_OPTION_TYPE = 'COMBINATION';

/** Fallback stock when a crawled option has no qty (consignment ⇒ effectively unlimited). */
const DEFAULT_OPTION_STOCK = 999;

/** Product-table option columns produced from crawled options. */
export interface ProductOptionFields {
  hasOptions: boolean;
  optionName: string;
  optionType: string;
  /** jsonb: array of value labels. */
  optionValues: string[];
  /** jsonb: per-combination rows the gate validates as a non-empty array. */
  options: Array<{
    optionName1: string;
    optionValue1: string;
    stockQuantity: number;
    price: number;
  }>;
}

/** product_options-table payload (option_type / option_names / option_rows). */
export interface ProductOptionsRow {
  option_type: string;
  option_names: string[];
  option_rows: Array<{
    values: string[];
    stock: number;
    price: number;
    status: 'ON_SALE';
  }>;
}

export interface MappedCrawlOptions {
  productFields: ProductOptionFields;
  productOptions: ProductOptionsRow;
}

/**
 * Normalize an arbitrary jsonb value (crawl_logs.options) into CrawledOption[].
 * Guards against null/non-array/malformed rows so callers can pass raw DB jsonb.
 * Rows without a non-empty `name` are dropped (a value-less option is unusable).
 */
export function normalizeCrawlOptions(raw: unknown): CrawledOption[] {
  if (!Array.isArray(raw)) return [];
  const out: CrawledOption[] = [];
  for (const r of raw) {
    if (!r || typeof r !== 'object') continue;
    const o = r as Record<string, unknown>;
    const name = typeof o.name === 'string' ? o.name.trim() : '';
    if (!name) continue;
    const qty = Number(o.qty);
    const addPrice = Number(o.addPrice);
    out.push({
      name,
      qty: Number.isFinite(qty) ? qty : DEFAULT_OPTION_STOCK,
      addPrice: Number.isFinite(addPrice) ? addPrice : 0,
    });
  }
  return out;
}

/**
 * Map crawled options to both stores. Returns null when there are no usable
 * options (caller keeps hasOptions=false and writes no product_options row —
 * single products without options stay on the existing path).
 *
 * @param raw      crawl_logs.options (raw jsonb or already-typed array)
 * @param axisName option-axis label; defaults to DEFAULT_OPTION_AXIS
 */
export function mapCrawlOptions(
  raw: unknown,
  axisName: string = DEFAULT_OPTION_AXIS,
): MappedCrawlOptions | null {
  const options = normalizeCrawlOptions(raw);
  if (options.length === 0) return null;

  const axis = axisName.trim() || DEFAULT_OPTION_AXIS;

  return {
    productFields: {
      hasOptions: true,
      optionName: axis,
      optionType: COMBINATION_OPTION_TYPE,
      optionValues: options.map((o) => o.name),
      options: options.map((o) => ({
        optionName1: axis,
        optionValue1: o.name,
        stockQuantity: o.qty ?? DEFAULT_OPTION_STOCK,
        price: o.addPrice ?? 0,
      })),
    },
    productOptions: {
      option_type: COMBINATION_OPTION_TYPE,
      option_names: [axis],
      option_rows: options.map((o) => ({
        values: [o.name],
        stock: o.qty ?? DEFAULT_OPTION_STOCK,
        price: o.addPrice ?? 0,
        status: 'ON_SALE',
      })),
    },
  };
}
