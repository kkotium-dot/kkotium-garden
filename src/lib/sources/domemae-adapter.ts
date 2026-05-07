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
      basis?: { title?: string; status?: string };
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
    };
  }

  /**
   * 6. Get the minimum order quantity. Currently always 1 because
   * Domeggook OpenAPI v4.5 does not surface MOQ in getItemView.
   * Sprint 6 may parse this from getItemList when it is wired up.
   */
  async getMinQuantity(_productNo: string): Promise<number> {
    return 1;
  }

  /**
   * 2. Search items - scaffolded for Sprint 6 (getItemList integration).
   */
  async searchItems(_filter: SearchFilter): Promise<ItemListResult> {
    notImplemented(PLATFORM_CODE, 'searchItems');
  }

  /**
   * 3. Bulk inventory - scaffolded for Sprint 6-A (getItemView multiple=true
   * 100-batch chunked polling). Will be enabled when 6-A is started.
   */
  async getInventory(_productNos: string[]): Promise<InventorySnapshot[]> {
    notImplemented(PLATFORM_CODE, 'getInventory');
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
