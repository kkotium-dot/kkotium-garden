// src/lib/sources/domemae-adapter.ts
// ============================================================================
// DomemaeAdapter - SourceAdapter implementation for Domeggook/Domemae
// ============================================================================
//
// Source: Domeggook OpenAPI v4.5 (https://domeggook.com/ssl/api/)
// Docs:   https://docs.channel.io/domeggook_api/ko
// Rate:   180 calls/min, 15,000 calls/day
// Channel: domeggook (dome) and domemae (supply) share one API key
//
// This adapter migrates the inline parsing logic that previously lived in
// src/app/api/crawler/domemae/route.ts. The route file now delegates to
// this adapter; external API contract remains unchanged.
//
// Sprint 6.5 scope:
//   - getItemDetail() is the primary use case (single product crawling)
//   - getMinQuantity() is implemented for the minq=1 filter
//   - searchItems(), getInventory(), getCategories() are scaffolded but
//     throw NotImplementedError until Sprint 6 enables them
//   - placeOrder() requires Private API; throws until Sprint 8
// ============================================================================

import { prisma } from '@/lib/prisma';
import {
  SourceAdapter,
  ItemDetail,
  CrawledOption,
  SearchFilter,
  ItemListResult,
  ItemSummary,
  InventorySnapshot,
  Category,
  OrderRequest,
  OrderResult,
  SourceAdapterError,
  notImplemented,
} from './source-adapter';

// ----------------------------------------------------------------------------
// Constants
// ----------------------------------------------------------------------------

const DOMEGGOOK_API = 'https://domeggook.com/ssl/api/';
const PLATFORM_CODE = 'DMM';
const PLATFORM_NAME = 'domeggook(domemae)';
const FETCH_TIMEOUT_MS = 15_000;

// ----------------------------------------------------------------------------
// Helpers (migrated from route.ts)
// ----------------------------------------------------------------------------

/**
 * Extract a numeric product number from common URL formats.
 * Returns null when no recognizable product number is present.
 */
export function extractProductNo(url: string): string | null {
  // domeme.domeggook.com/s/12345678
  const shortMatch = url.match(/\/s\/(\d{6,10})/);
  if (shortMatch) return shortMatch[1];
  // domeggook.com/...?uid=12345678 or no=12345678
  const uidMatch = url.match(/[?&](?:uid|no)=(\d{6,10})/);
  if (uidMatch) return uidMatch[1];
  // bare number
  if (/^\d{6,10}$/.test(url.trim())) return url.trim();
  return null;
}

/**
 * Parse price.supply which can be int or "1+3800|20+3500" string.
 * For tiered pricing returns the lowest tier (minimum order price).
 */
export function parseSupplyPrice(val: unknown): number {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const first = val.split('|')[0];
    const price = parseInt(first.split('+')[1] ?? first, 10);
    return isNaN(price) ? 0 : price;
  }
  return 0;
}

/**
 * Parse shipping fee from the deli object. Defaults to 3000 when unknown
 * to match the previous route.ts behavior.
 */
export function parseShipFee(deli: Record<string, unknown> | undefined): number {
  if (!deli) return 3000;
  const supply = deli.supply as Record<string, unknown> | undefined;
  const dome = deli.dome as Record<string, unknown> | undefined;
  const src = supply ?? dome;
  if (!src) return 3000;
  if (src.type === '\uBB34\uB8CC\uBC30\uC1A1') return 0; // 무료배송
  const fee = src.fee;
  if (typeof fee === 'number') return fee;
  if (typeof fee === 'string') {
    const n = parseInt(fee, 10);
    return isNaN(n) ? 3000 : n;
  }
  return 3000;
}

/**
 * Parse options from the selectOpt JSON string. Returns structured data
 * suitable for ItemDetail.options.
 */
export function parseOptions(selectOpt: string | undefined): CrawledOption[] {
  if (!selectOpt) return [];
  try {
    const parsed = JSON.parse(selectOpt) as {
      data?: Record<
        string,
        {
          name?: string;
          hid?: string | number;
          qty?: string | number;
          addprice?: string | number;
        }
      >;
      type?: string;
    };
    if (parsed.data) {
      return Object.values(parsed.data)
        .filter((o) => String(o.hid ?? '0') !== '1') // exclude hidden
        .map((o) => ({
          name: o.name?.trim() ?? '',
          qty: parseInt(String(o.qty ?? '0'), 10) || 0,
          addPrice: parseInt(String(o.addprice ?? '0'), 10) || 0,
        }))
        .filter((o) => o.name)
        .slice(0, 30);
    }
  } catch {
    // ignore parse errors
  }
  return [];
}

/**
 * Parse basis.minq from getItemView. Domeggook returns this as number or
 * numeric string; values <= 0 or NaN are treated as no MOQ (returns 1).
 */
export function parseMinq(val: unknown): number {
  if (typeof val === 'number' && Number.isFinite(val) && val >= 1) {
    return Math.floor(val);
  }
  if (typeof val === 'string') {
    const n = parseInt(val.trim(), 10);
    if (Number.isFinite(n) && n >= 1) return n;
  }
  return 1;
}

/**
 * Read the Domeggook API key from store_settings. Returns null when missing.
 */
async function getApiKey(): Promise<string | null> {
  try {
    const rows = await prisma.$queryRaw<{ domeggook_api_key: string }[]>`
      SELECT domeggook_api_key FROM store_settings WHERE id = 'default' LIMIT 1
    `;
    const key = rows[0]?.domeggook_api_key?.trim();
    return key || null;
  } catch {
    return null;
  }
}

// ----------------------------------------------------------------------------
// Adapter implementation
// ----------------------------------------------------------------------------

export class DomemaeAdapter implements SourceAdapter {
  readonly platformCode = PLATFORM_CODE;
  readonly platformName = PLATFORM_NAME;

  /**
   * 1. Single item detail via getItemView ver 4.5.
   * This is the primary use case and is fully migrated from route.ts.
   */
  async getItemDetail(productNo: string): Promise<ItemDetail | null> {
    const apiKey = await getApiKey();
    if (!apiKey) {
      throw new SourceAdapterError(
        PLATFORM_CODE,
        'AuthFailed',
        'Domeggook API key is not configured (store_settings.domeggook_api_key).',
      );
    }

    const apiUrl =
      `${DOMEGGOOK_API}?ver=4.5&mode=getItemView` +
      `&aid=${encodeURIComponent(apiKey)}&no=${encodeURIComponent(productNo)}&om=json`;

    let res: Response;
    try {
      res = await fetch(apiUrl, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    } catch (e) {
      throw new SourceAdapterError(
        PLATFORM_CODE,
        'Network',
        `Network error while calling getItemView (no=${productNo})`,
        e,
      );
    }

    if (!res.ok) {
      throw new SourceAdapterError(
        PLATFORM_CODE,
        'BadResponse',
        `getItemView returned HTTP ${res.status}`,
      );
    }

    const raw = (await res.json()) as {
      domeggook?: Record<string, unknown>;
      errors?: unknown;
    };

    if (raw.errors || !raw.domeggook) {
      const errMsg = JSON.stringify(raw.errors ?? raw).slice(0, 200);
      // Domeggook returns 200 even on errors; treat as NotFound when product missing
      throw new SourceAdapterError(
        PLATFORM_CODE,
        'BadResponse',
        `getItemView API error: ${errMsg}`,
      );
    }

    const item = raw.domeggook as {
      basis?: { title?: string; status?: string; minq?: number | string };
      price?: {
        supply?: unknown;
        dome?: unknown;
        resale?: { minimum?: number; Recommand?: number };
      };
      qty?: { inventory?: number; supplyUnit?: number };
      deli?: Record<string, unknown>;
      seller?: {
        id?: string;
        nick?: string;
        rank?: number;
        power?: string;
        score?: { avg?: number };
        company?: {
          name?: string;
          boss?: string;
          cno?: string;
          addr?: string;
          phone?: string;
        };
      };
      thumb?: { large?: string; largePng?: string; original?: string };
      selectOpt?: string;
      detail?: { country?: string; manufacturer?: string };
      category?: { current?: { name?: string; code?: string } };
      channel?: { supply?: boolean };
    };

    const name = item.basis?.title?.replace(/\s+/g, ' ').trim() ?? '';
    const supplierPrice = parseSupplyPrice(item.price?.supply);
    const inventory = item.qty?.inventory ?? 0;
    const shipFee = parseShipFee(item.deli);
    const mergeShip = item.deli?.merge as { enable?: string } | undefined;
    const canMerge = mergeShip?.enable === 'y';
    // company.name is the real business name; nick is often empty string
    const sellerNick = String(
      item.seller?.company?.name || item.seller?.nick || '',
    );
    const sellerId = String(item.seller?.id ?? '');
    const sellerRank = item.seller?.rank ?? 0;
    const options = parseOptions(item.selectOpt);
    const thumbUrl =
      item.thumb?.largePng ?? item.thumb?.large ?? item.thumb?.original ?? '';
    const images = thumbUrl ? [thumbUrl] : [];
    const country = item.detail?.country ?? '';
    const categoryName = item.category?.current?.name ?? '';
    const categoryCode = item.category?.current?.code ?? '';
    const isOnSupply = item.channel?.supply === true;
    const status = item.basis?.status ?? '';
    const minQuantity = parseMinq(item.basis?.minq);

    return {
      productNo,
      name,
      supplierPrice,
      images,
      options,
      description: '', // not provided by getItemView ver 4.5
      sourceUrl: `https://domeme.domeggook.com/s/${productNo}`,
      inventory,
      shipFee,
      canMerge,
      sellerNick,
      sellerId,
      sellerRank,
      categoryName,
      categoryCode,
      country,
      status,
      isOnSupply,
      minQuantity,
    };
  }

  /**
   * 6. Get the minimum order quantity via getItemView (single call).
   * Domeggook OpenAPI v4.5 returns basis.minq in the single-item shape.
   * Returns 1 when MOQ cannot be determined (treated as no restriction).
   */
  async getMinQuantity(productNo: string): Promise<number> {
    const detail = await this.getItemDetail(productNo);
    return detail?.minQuantity ?? 1;
  }

  /**
   * 2. Search items via getItemList ver 4.5.
   * Sprint 6-C: powers competitor tracker. Returns a page of search results.
   * Each result is a lightweight ItemSummary (no options / no description).
   *
   * Rate limit: 180/min, 15000/day (shared bucket with getItemView).
   * Caller throttles externally — adapter does no throttling.
   *
   * Filters mapped to native query params:
   *   keyword     → kw
   *   categoryCode → ca
   *   minPrice    → sp
   *   maxPrice    → ep
   *   sortBy      → so (recent=date, popular=hit, priceAsc=price_asc,
   *                     priceDesc=price_desc, sales=sale)
   *   page        → pg (1-based)
   *   pageSize    → sz (1..100; default 20)
   */
  async searchItems(filter: SearchFilter): Promise<ItemListResult> {
    const apiKey = await getApiKey();
    if (!apiKey) {
      throw new SourceAdapterError(
        PLATFORM_CODE,
        'AuthFailed',
        'Domeggook API key is not configured (store_settings.domeggook_api_key).',
      );
    }

    const page = Math.max(1, filter.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, filter.pageSize ?? 20));

    const sortMap: Record<NonNullable<SearchFilter['sortBy']>, string> = {
      recent:    'date',
      popular:   'hit',
      priceAsc:  'price_asc',
      priceDesc: 'price_desc',
      sales:     'sale',
    };
    const so = filter.sortBy ? sortMap[filter.sortBy] : 'hit';

    const params = new URLSearchParams();
    params.set('ver', '4.5');
    params.set('mode', 'getItemList');
    params.set('aid', apiKey);
    params.set('om', 'json');
    params.set('pg', String(page));
    params.set('sz', String(pageSize));
    params.set('so', so);
    if (filter.keyword)      params.set('kw', filter.keyword);
    if (filter.categoryCode) params.set('ca', filter.categoryCode);
    if (filter.minPrice != null) params.set('sp', String(filter.minPrice));
    if (filter.maxPrice != null) params.set('ep', String(filter.maxPrice));

    let res: Response;
    try {
      res = await fetch(`${DOMEGGOOK_API}?${params.toString()}`, {
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
    } catch (e) {
      throw new SourceAdapterError(
        PLATFORM_CODE,
        'Network',
        `Network error in searchItems (kw=${filter.keyword ?? ''})`,
        e,
      );
    }

    if (!res.ok) {
      throw new SourceAdapterError(
        PLATFORM_CODE,
        'BadResponse',
        `searchItems returned HTTP ${res.status}`,
      );
    }

    const raw = (await res.json()) as {
      domeggook?: {
        header?: { numberOfItems?: number | string };
        list?: {
          item?: Array<{
            no?: string | number;
            title?: string;
            price?: number | string;
            seller?: { id?: string | number; nick?: string; company?: { name?: string } };
            thumb?: string;
            url?: string;
            minq?: number | string;
          }>;
        };
      };
      errors?: unknown;
    };

    if (raw.errors || !raw.domeggook) {
      return { items: [], totalCount: 0, page, pageSize };
    }

    const dome = raw.domeggook;
    const rawItems = dome.list?.item ?? [];
    const totalCount = parseInt(String(dome.header?.numberOfItems ?? '0'), 10) || 0;

    const items: ItemSummary[] = rawItems.map((it) => {
      const productNo = String(it.no ?? '');
      const name = (it.title ?? '').replace(/\s+/g, ' ').trim();
      const priceRaw = it.price;
      const supplierPrice = typeof priceRaw === 'number'
        ? priceRaw
        : parseInt(String(priceRaw ?? '0'), 10) || 0;
      const sellerId = String(it.seller?.id ?? '');
      const sellerNick = String(it.seller?.company?.name || it.seller?.nick || '');
      const thumbUrl = String(it.thumb ?? '');
      const sourceUrl = String(it.url ?? (productNo ? `https://domeme.domeggook.com/s/${productNo}` : ''));
      const minQuantity = parseMinq(it.minq);
      return {
        productNo,
        name,
        supplierPrice,
        thumbUrl,
        sellerId,
        sellerNick,
        sourceUrl,
        minQuantity,
      };
    });

    return { items, totalCount, page, pageSize };
  }

  /**
   * 3. Bulk inventory snapshot via getItemView multiple=true.
   * Domeggook OpenAPI v4.5 supports up to 100 productNos per call.
   * Caller must chunk inputs > 100 (caller responsibility, not adapter).
   * Returns same-length array; missing/error productNos get qty=-1, status='unknown'.
   * Rate limit: 180/min, 15000/day. Adapter does NOT throttle internally.
   */
  async getInventory(productNos: string[]): Promise<InventorySnapshot[]> {
    if (productNos.length === 0) return [];
    if (productNos.length > 100) {
      throw new SourceAdapterError(
        PLATFORM_CODE,
        'BadResponse',
        `getInventory accepts max 100 productNos per call (got ${productNos.length}). Caller must chunk.`,
      );
    }

    const apiKey = await getApiKey();
    if (!apiKey) {
      throw new SourceAdapterError(
        PLATFORM_CODE,
        'AuthFailed',
        'Domeggook API key is not configured (store_settings.domeggook_api_key).',
      );
    }

    const polledAt = new Date();
    const idsParam = productNos.join(',');
    const apiUrl =
      `${DOMEGGOOK_API}?ver=4.5&mode=getItemView` +
      `&aid=${encodeURIComponent(apiKey)}&no=${encodeURIComponent(idsParam)}` +
      `&multiple=true&om=json`;

    let res: Response;
    try {
      res = await fetch(apiUrl, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS * 2) });
    } catch (e) {
      throw new SourceAdapterError(
        PLATFORM_CODE,
        'Network',
        `Network error in getInventory (${productNos.length} ids)`,
        e,
      );
    }

    if (!res.ok) {
      throw new SourceAdapterError(
        PLATFORM_CODE,
        'BadResponse',
        `getInventory returned HTTP ${res.status}`,
      );
    }

    const raw = (await res.json()) as {
      domeggook?:
        | {
            multipleResult?: {
              item?: Array<{
                no?: string | number;
                basis?: { status?: string; minq?: number | string };
                qty?: { inventory?: number };
                price?: { supply?: number | string };
              }>;
            };
            // Single-item fallback shape (when API returns 1 item without multipleResult wrapper)
            basis?: { status?: string; minq?: number | string };
            qty?: { inventory?: number };
            price?: { supply?: number | string };
          };
      errors?: unknown;
    };

    if (raw.errors || !raw.domeggook) {
      // On global error, return all as unknown (qty=-1)
      return productNos.map((no) => ({
        productNo: no,
        qty: -1,
        status: 'unknown',
        supplierPrice: null,
        polledAt,
      }));
    }

    const dome = raw.domeggook;
    // multiple=true wraps in multipleResult.item; single result returns basis/qty at root
    const items = dome.multipleResult?.item ?? (dome.basis ? [dome] : []);

    // Build a map for O(1) lookup, then preserve input order
    const resultMap = new Map<string, InventorySnapshot>();
    for (const it of items) {
      const no = String((it as { no?: string | number }).no ?? '');
      const qtyVal = (it as { qty?: { inventory?: number } }).qty?.inventory ?? -1;
      const statusVal = (it as { basis?: { status?: string } }).basis?.status ?? 'unknown';
      const supplyRaw = (it as { price?: { supply?: number | string } }).price?.supply;
      // parseSupplyPrice returns 0 when unavailable. Distinguish 0 (unknown) from
      // a real "free item" by treating only undefined as null.
      const supplierPrice =
        supplyRaw === undefined || supplyRaw === null ? null : parseSupplyPrice(supplyRaw);
      // Note: minq is parsed by the poller from a separate getItemDetail call when needed.
      // multiple=true response does not always include basis.minq for performance reasons.
      if (no) {
        resultMap.set(no, {
          productNo: no,
          qty: typeof qtyVal === 'number' ? qtyVal : -1,
          status: String(statusVal),
          supplierPrice,
          polledAt,
        });
      }
    }

    return productNos.map(
      (no) =>
        resultMap.get(no) ?? {
          productNo: no,
          qty: -1,
          status: 'unknown',
          supplierPrice: null,
          polledAt,
        },
    );
  }

  /**
   * 4. Category tree - scaffolded for Sprint 6-E (getCat ver 2.0 full cache).
   */
  async getCategories(): Promise<Category[]> {
    notImplemented(PLATFORM_CODE, 'getCategories');
  }

  /**
   * 5. Order placement - requires Private API. Sprint 8 feature.
   */
  async placeOrder(_order: OrderRequest): Promise<OrderResult> {
    notImplemented(PLATFORM_CODE, 'placeOrder');
  }
}

// Singleton instance for convenience. Adapter is stateless so a single
// instance is safe across requests.
export const domemaeAdapter = new DomemaeAdapter();
