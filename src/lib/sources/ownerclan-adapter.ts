// src/lib/sources/ownerclan-adapter.ts
// ============================================================================
// OwnerClanAdapter - SourceAdapter stub for OwnerClan
// ============================================================================
//
// Source: OwnerClan (https://ownerclan.com)
// Status: STUB - structure only, not yet wired to a real OwnerClan API key.
//
// Why this stub exists (Sprint 6.5):
//   The seller has signed up for OwnerClan and the business account is
//   verified. Adding the adapter scaffold now means future Sprint 6 features
//   (inventory polling, price tracking, kkotti curator) can be written
//   against the abstract interface rather than against domeggook only.
//
// Activation steps (future session):
//   1. Obtain OwnerClan API credentials and choose endpoint pattern
//      (REST/GraphQL/private webhooks - to be confirmed)
//   2. Add OWNERCLAN_API_KEY (or equivalent) to env config
//   3. Replace each notImplemented() call with the real implementation
//   4. Add unit tests against a known sample product
//   5. Wire into Sprint 6 features (inventory poller, etc.) by registering
//      this adapter in the platforms registry alongside domemaeAdapter
// ============================================================================

import {
  SourceAdapter,
  ItemDetail,
  SearchFilter,
  ItemListResult,
  InventorySnapshot,
  Category,
  OrderRequest,
  OrderResult,
  notImplemented,
} from './source-adapter';

const PLATFORM_CODE = 'OWC';
const PLATFORM_NAME = 'OwnerClan';

export class OwnerClanAdapter implements SourceAdapter {
  readonly platformCode = PLATFORM_CODE;
  readonly platformName = PLATFORM_NAME;

  async getItemDetail(productNo: string): Promise<ItemDetail | null> {
    console.log(`[${PLATFORM_CODE}] getItemDetail stub called: productNo=${productNo}`);
    notImplemented(PLATFORM_CODE, 'getItemDetail');
  }

  async searchItems(filter: SearchFilter): Promise<ItemListResult> {
    console.log(`[${PLATFORM_CODE}] searchItems stub called:`, filter);
    notImplemented(PLATFORM_CODE, 'searchItems');
  }

  async getInventory(productNos: string[]): Promise<InventorySnapshot[]> {
    console.log(
      `[${PLATFORM_CODE}] getInventory stub called: ${productNos.length} items`,
    );
    notImplemented(PLATFORM_CODE, 'getInventory');
  }

  async getCategories(): Promise<Category[]> {
    console.log(`[${PLATFORM_CODE}] getCategories stub called`);
    notImplemented(PLATFORM_CODE, 'getCategories');
  }

  async placeOrder(order: OrderRequest): Promise<OrderResult> {
    console.log(`[${PLATFORM_CODE}] placeOrder stub called:`, order);
    notImplemented(PLATFORM_CODE, 'placeOrder');
  }

  async getMinQuantity(productNo: string): Promise<number> {
    console.log(`[${PLATFORM_CODE}] getMinQuantity stub called: productNo=${productNo}`);
    notImplemented(PLATFORM_CODE, 'getMinQuantity');
  }
}

// Singleton instance for convenience.
export const ownerClanAdapter = new OwnerClanAdapter();
