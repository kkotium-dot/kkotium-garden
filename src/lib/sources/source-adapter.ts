// src/lib/sources/source-adapter.ts
// ============================================================================
// SourceAdapter - Common interface for all B2B wholesale source channels
// ============================================================================
//
// Purpose:
//   Define a unified contract that every B2B source (domeggook/domemae,
//   ownerclan, dometopia, 1688, etc.) must implement, so that downstream
//   features (Sprint 6 inventory polling, price tracking, kkotti AI
//   recommendations, etc.) are written against the abstract interface
//   rather than against any specific platform.
//
// Why this exists (Sprint 6.5 Plan A session 1):
//   Without this layer, every Sprint 6/7 task would hard-code domeggook
//   API call patterns. Adding ownerclan or dometopia later would require
//   a full refactor of inventory-poller / price-tracker / curator.
//   With this layer, each new source only needs to implement six methods
//   and register itself in the platforms registry.
//
// Implementation rule (work-principle #29):
//   English-only comments and identifiers. No Korean string literals
//   in type definitions (use enum-like string unions of English codes).
// ============================================================================

// ----------------------------------------------------------------------------
// 1. Common types
// ----------------------------------------------------------------------------

/**
 * One option row of a product (e.g. color/size variant).
 * Mirrors the structure currently used by domeggook/api/crawler/domemae/route.ts
 * so that the existing UI consumers do not need to change.
 */
export interface CrawledOption {
  /** Display label for the option (e.g. "red / large"). */
  name: string;
  /** Stock per option (0 = sold out). */
  qty: number;
  /** Additional price added on top of the base supply price. */
  addPrice: number;
}

/**
 * Detailed product info returned by getItemDetail().
 * Field names mirror the existing domemae/route.ts response so that
 * frontend code (crawl/page.tsx, AlternativeProductPanel, DomemaeCrawler)
 * does not need to change.
 */
export interface ItemDetail {
  /** Source-specific product number (string for portability). */
  productNo: string;
  /** Product display name. */
  name: string;
  /** Supplier-side price (KRW). For tiered pricing this is the lowest tier. */
  supplierPrice: number;
  /** Main image URLs (already absolute https URLs). */
  images: string[];
  /** Structured options array. Empty when product has no options. */
  options: CrawledOption[];
  /** Plain-text description (max ~2000 chars). */
  description: string;
  /** Canonical product page URL on the source platform. */
  sourceUrl: string;
  /** Stock count of the base product (-1 means unknown / unlimited). */
  inventory: number;
  /** Per-shipment fee (KRW). 0 means free shipping. */
  shipFee: number;
  /** True if this product can be merged into a single delivery with same supplier. */
  canMerge: boolean;
  /** Display name of the supplier (company name preferred over nickname). */
  sellerNick: string;
  /** Stable supplier ID on the source platform. */
  sellerId: string;
  /** Supplier rank/grade (0 if unknown). */
  sellerRank: number;
  /** Source-side category leaf name (Korean text from the platform). */
  categoryName: string;
  /** Source-side category code. */
  categoryCode: string;
  /** Country of origin string from the platform (Korean text). */
  country: string;
  /** Product status flag from the platform (e.g. on sale, paused). */
  status: string;
  /** True if the product is also sold on the supply (도매매) channel. */
  isOnSupply: boolean;
}

/**
 * Filter for searchItems(). Each adapter maps these to its native query params.
 */
export interface SearchFilter {
  /** Free-text keyword. */
  keyword?: string;
  /** Source-side category code. */
  categoryCode?: string;
  /** Minimum price (KRW). */
  minPrice?: number;
  /** Maximum price (KRW). */
  maxPrice?: number;
  /** Minimum order quantity ceiling. minq=1 means buy-one items only. */
  maxMinQuantity?: number;
  /** Sort key. Adapters map these to native sort options. */
  sortBy?: 'recent' | 'popular' | 'priceAsc' | 'priceDesc' | 'sales';
  /** Page number (1-based). */
  page?: number;
  /** Page size. */
  pageSize?: number;
}

/**
 * Lightweight item summary returned by searchItems().
 */
export interface ItemSummary {
  productNo: string;
  name: string;
  supplierPrice: number;
  thumbUrl: string;
  sellerId: string;
  sellerNick: string;
  sourceUrl: string;
  /** Minimum order quantity (1 if unrestricted). */
  minQuantity: number;
}

/**
 * Result envelope of searchItems().
 */
export interface ItemListResult {
  items: ItemSummary[];
  totalCount: number;
  page: number;
  pageSize: number;
}

/**
 * Inventory snapshot for a single product (used by getInventory bulk call).
 */
export interface InventorySnapshot {
  productNo: string;
  /** Stock count. -1 = unknown, 0 = sold out. */
  qty: number;
  /** Status flag (mirrors ItemDetail.status). */
  status: string;
  /** When the snapshot was captured. */
  polledAt: Date;
}

/**
 * Source-side category node.
 */
export interface Category {
  code: string;
  name: string;
  /** 1-based depth. Domeggook is up to 5 deep. */
  depth: number;
  /** Parent category code (null at root). */
  parentCode: string | null;
  /** Number of items in this category (0 if not provided). */
  itemCount: number;
}

/**
 * Order placement request (used by Sprint 8 auto-purchase, not Sprint 6).
 * Stub adapters can throw NotImplementedError.
 */
export interface OrderRequest {
  productNo: string;
  quantity: number;
  selectedOption?: string;
  /** Buyer-side memo (e.g. naver order ID). */
  memo?: string;
  /** Delivery address payload. */
  deliveryAddress?: {
    name: string;
    phone: string;
    zipcode: string;
    addr: string;
    addrDetail?: string;
  };
}

/**
 * Order placement result.
 */
export interface OrderResult {
  /** Source-platform order ID. */
  sourceOrderId: string;
  /** Order placement timestamp. */
  placedAt: Date;
  /** Total amount charged (KRW). */
  totalAmount: number;
}

// ----------------------------------------------------------------------------
// 2. Adapter interface
// ----------------------------------------------------------------------------

/**
 * Every B2B source channel implements this interface. Downstream code
 * (Sprint 6 inventory poller, price tracker, kkotti curator, etc.)
 * depends only on this abstract contract.
 */
export interface SourceAdapter {
  /** Stable platform code matching the platforms.code DB column. */
  readonly platformCode: string;
  /** Human-readable platform name. */
  readonly platformName: string;

  /**
   * 1. Get a single item's detail.
   * Throws on network/api errors. Returns null when the productNo is
   * confirmed not found by the platform.
   */
  getItemDetail(productNo: string): Promise<ItemDetail | null>;

  /**
   * 2. Search items by filter conditions.
   */
  searchItems(filter: SearchFilter): Promise<ItemListResult>;

  /**
   * 3. Get bulk inventory snapshot. Implementations may chunk internally
   * to respect rate limits (domeggook getItemView multiple=true caps at 100).
   */
  getInventory(productNos: string[]): Promise<InventorySnapshot[]>;

  /**
   * 4. Get the full category tree. Implementations should cache locally
   * (monthly refresh is enough for most platforms).
   */
  getCategories(): Promise<Category[]>;

  /**
   * 5. Place an order. Sprint 8 feature; stub adapters may throw
   * NotImplementedError.
   */
  placeOrder(order: OrderRequest): Promise<OrderResult>;

  /**
   * 6. Get the minimum order quantity for a product. Used by sourcing
   * filters (e.g. "show only minq=1 items for solo sellers").
   * Returns 1 when the platform has no MOQ restriction.
   */
  getMinQuantity(productNo: string): Promise<number>;
}

// ----------------------------------------------------------------------------
// 3. Helpers
// ----------------------------------------------------------------------------

/**
 * Standard error class for source adapter failures.
 * Wraps platform-specific errors with a stable shape so that downstream
 * code can branch on `.kind` without parsing platform error strings.
 */
export class SourceAdapterError extends Error {
  constructor(
    public readonly platformCode: string,
    public readonly kind:
      | 'NotFound'
      | 'AuthFailed'
      | 'RateLimited'
      | 'NotImplemented'
      | 'Network'
      | 'BadResponse'
      | 'Unknown',
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'SourceAdapterError';
  }
}

/**
 * Helper for stub adapters: throws a NotImplementedError.
 * Use this in adapter methods that are scaffolded but not yet wired up.
 */
export function notImplemented(
  platformCode: string,
  methodName: string,
): never {
  throw new SourceAdapterError(
    platformCode,
    'NotImplemented',
    `[${platformCode}] ${methodName}() is not implemented yet. ` +
      `This adapter is a stub; wire up the real platform API before using.`,
  );
}
