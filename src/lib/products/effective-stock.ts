// src/lib/products/effective-stock.ts
// ============================================================================
// EFFECTIVE_STOCK_2026-09-21 — single authority for "what is this product's
// real stock right now" (#51 fix — Product.stock does not exist as a DB
// column; #16 조사 중 발견: 씨앗심기 재고수량 입력이 sanitizeProductWrite
// (#150)에서 조용히 버려지고, 엑셀 생성(/api/naver/excel)도 p.stock ??
// 999로 무조건 999를 강제해왔다).
//
// 전 상품 공통 두 갈래(대표님 지시, 2026-09-21):
//   1) 옵션이 있는 상품 -> 옵션별 재고(option_rows[].stock)의 합산이 총 재고.
//   2) 옵션이 없는 단품 -> 크롤/공급사 폴링이 채운 InventorySnapshot의 최신
//      qty가 재고(#260 조회실패 센티널 qty=-1은 "재고 0"이 아니라 "모름"이므로
//      합산·표시 모두에서 제외 — source-gone.ts와 동일한 규약, #295).
//
// 이 파일은 순수 계산만 한다(입력을 이미 로드된 형태로 받음) — DB/Prisma
// 접근은 호출부(server-only 래퍼 또는 API route)의 책임. 클라이언트 컴포넌트
// (씨앗심기 화면)에서도 안전하게 import 가능(#32/#37).
// ============================================================================

/** One row of product_options.option_rows (JSON). */
export interface OptionStockRow {
  stock?: unknown;
}

/** #260 조회실패 센티널 — source-gone.ts / disposition.ts와 동일 규약. */
const INVENTORY_UNKNOWN_SENTINEL = -1;

/**
 * Sum option-row stocks. Rows with a non-finite/negative stock are treated as
 * 0 (a malformed or manually-zeroed row should not inflate the total) — this
 * differs from the snapshot sentinel below, which means "unknown" rather than
 * "malformed", because option rows are operator/crawl-authored, not a polled
 * external source that can silently fail.
 */
export function sumOptionStocks(rows: readonly OptionStockRow[] | null | undefined): number {
  if (!Array.isArray(rows) || rows.length === 0) return 0;
  let total = 0;
  for (const row of rows) {
    const n = typeof row?.stock === 'number' ? row.stock : Number(row?.stock);
    if (Number.isFinite(n) && n > 0) total += n;
  }
  return total;
}

export interface EffectiveStockInput {
  /** True when this product has one or more options (option_rows non-empty). */
  hasOptions: boolean;
  /** option_rows from product_options, when hasOptions is true. */
  optionRows?: readonly OptionStockRow[] | null;
  /** Most recent InventorySnapshot.qty for this product (single item / no options case). */
  latestSnapshotQty?: number | null;
}

export interface EffectiveStockResult {
  /** The number to show/export. Never negative. */
  stock: number;
  /** Where the number came from — surfaced in UI so the operator is never misled. */
  source: 'option_sum' | 'supplier_snapshot' | 'unknown';
}

/**
 * Resolve the one true stock number for a product, per the two-branch rule
 * above. Pure — safe for both server (API routes) and client (씨앗심기 폼)
 * use once the caller has already loaded optionRows / latestSnapshotQty.
 */
export function resolveEffectiveStock(input: EffectiveStockInput): EffectiveStockResult {
  if (input.hasOptions) {
    return { stock: sumOptionStocks(input.optionRows), source: 'option_sum' };
  }
  const qty = input.latestSnapshotQty;
  if (typeof qty === 'number' && Number.isFinite(qty) && qty !== INVENTORY_UNKNOWN_SENTINEL) {
    // A polled qty of exactly 0 is a real "out of stock" — keep it, don't floor to unknown.
    return { stock: Math.max(qty, 0), source: 'supplier_snapshot' };
  }
  // No options AND no usable snapshot (never polled yet, or polling failed
  // every time) — surface as unknown rather than guessing a number. Callers
  // decide the display fallback (e.g. "재고 미확인" badge); this function
  // never invents a default like the old `|| 999`.
  return { stock: 0, source: 'unknown' };
}
