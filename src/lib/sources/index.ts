// src/lib/sources/index.ts
// ============================================================================
// Sources registry - public re-exports + getAdapter() lookup
// ============================================================================
//
// Use this module to obtain a SourceAdapter by platform code:
//
//   import { getAdapter } from '@/lib/sources';
//   const adapter = getAdapter('DMM');
//   const detail = await adapter.getItemDetail('55884601');
//
// Adding a new adapter (e.g. 1688, dometopia):
//   1. Implement SourceAdapter in src/lib/sources/<name>-adapter.ts
//   2. Insert a row into the platforms DB table (code matching platformCode)
//   3. Register it in the ADAPTERS map below
// ============================================================================

import type { SourceAdapter } from './source-adapter';
import { domemaeAdapter } from './domemae-adapter';
import { ownerClanAdapter } from './ownerclan-adapter';

export type {
  SourceAdapter,
  ItemDetail,
  CrawledOption,
  SearchFilter,
  ItemSummary,
  ItemListResult,
  InventorySnapshot,
  Category,
  OrderRequest,
  OrderResult,
} from './source-adapter';
export { SourceAdapterError } from './source-adapter';

/**
 * Map of platform code -> adapter instance.
 * Codes mirror the platforms.code DB column.
 */
const ADAPTERS: Record<string, SourceAdapter> = {
  DMM: domemaeAdapter,
  OWC: ownerClanAdapter,
};

/**
 * Look up an adapter by platform code. Returns null when the code is
 * not registered (caller should handle gracefully).
 */
export function getAdapter(platformCode: string): SourceAdapter | null {
  return ADAPTERS[platformCode] ?? null;
}

/**
 * List all registered adapter codes. Useful for cron jobs that iterate
 * over every connected source.
 */
export function listAdapterCodes(): string[] {
  return Object.keys(ADAPTERS);
}
