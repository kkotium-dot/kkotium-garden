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
// B-8: gallery image extraction from desc.contents
// ----------------------------------------------------------------------------

const IMG_SRC_RE = /<img[^>]+src\s*=\s*["']([^"']+)["']/gi;
const ABSOLUTE_HTTP_RE = /^https?:\/\//i;
// Reject thumbnail-sized variants (Naver _stt_330, _stt_500, etc.) and tiny GIFs.
const THUMB_TAG_RE = /_stt_\d{1,3}\b|_thumb\b|\.gif(\?|$)/i;

function extractGalleryImages(html: string): string[] {
  if (!html || typeof html !== 'string') return [];
  const urls: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = IMG_SRC_RE.exec(html)) !== null) {
    const src = match[1]?.trim();
    if (!src || !ABSOLUTE_HTTP_RE.test(src)) continue;
    if (THUMB_TAG_RE.test(src)) continue;
    urls.push(src);
  }
  return urls;
}

function dedupeImages(urls: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const u of urls) {
    if (!u) continue;
    if (seen.has(u)) continue;
    seen.add(u);
    out.push(u);
  }
  return out;
}

function stripHtmlToText(html: string): string {
  if (!html || typeof html !== 'string') return '';
  const text = html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|tr|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return text.length > 2000 ? text.slice(0, 2000) : text;
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
      desc?: { contents?: string };
    };

    const name = String(item.basis?.title ?? '').replace(/\s+/g, ' ').trim();
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
    // B-8: prefer thumb.original (highest source resolution, typically ≥760px).
    // largePng/large are auto-derived smaller crops (often _stt_330 variants).
    const thumbUrl =
      item.thumb?.original ?? item.thumb?.largePng ?? item.thumb?.large ?? '';
    // Domeggook serializes an empty detail body as an empty object {} rather
    // than '', so a nullish guard is insufficient. Coerce non-string to ''.
    const descContents =
      typeof item.desc?.contents === 'string' ? item.desc.contents : '';
    const galleryImages = extractGalleryImages(descContents);
    const images = dedupeImages([thumbUrl, ...galleryImages]);
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
      description: stripHtmlToText(descContents),
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

    // Real API shape (verified against live API 2026-07-18, work principle #270):
    //   multiple=true -> { domeggook: { item: [ { basis:{no,status}, qty:{inventory}, price:{supply} } ] } }
    //   single        -> { domeggook: {   basis:{no,status}, qty:{inventory}, price:{supply} } }
    // Note `inventory` arrives as a STRING ("7934"), and the item id lives at
    // basis.no — not at the item root, and there is no `multipleResult` wrapper.
    type DomeItem = {
      basis?: { no?: string | number; status?: string; minq?: number | string };
      qty?: { inventory?: number | string };
      price?: { supply?: number | string };
    };
    const raw = (await res.json()) as {
      domeggook?: DomeItem & { item?: DomeItem[] };
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
    // multiple=true -> domeggook.item[]; single -> basis/qty at root.
    const items: DomeItem[] = dome.item ?? (dome.basis ? [dome] : []);

    // Build a map for O(1) lookup, then preserve input order
    const resultMap = new Map<string, InventorySnapshot>();
    for (const it of items) {
      // Item id lives at basis.no (not at the item root).
      const no = String(it.basis?.no ?? '');
      // inventory arrives as a string; coerce defensively and keep -1 as the
      // "could not read" sentinel (work principle #260).
      const invRaw = it.qty?.inventory;
      const invNum = invRaw === undefined || invRaw === null ? NaN : Number(invRaw);
      const qtyVal = Number.isFinite(invNum) ? invNum : -1;
      const statusVal = it.basis?.status ?? 'unknown';
      const supplyRaw = it.price?.supply;
      // parseSupplyPrice returns 0 when unavailable. Distinguish 0 (unknown) from
      // a real "free item" by treating only undefined as null.
      const supplierPrice =
        supplyRaw === undefined || supplyRaw === null ? null : parseSupplyPrice(supplyRaw);
      // Note: minq is parsed by the poller from a separate getItemDetail call when needed.
      // multiple=true response does not always include basis.minq for performance reasons.
      if (no) {
        resultMap.set(no, {
          productNo: no,
          qty: qtyVal,
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
   * 4. Category tree via getCat ver 2.0.
   * Sprint 6-E: powers the dome category cache. Returns the full domeggook
   * category tree (4-5 depth, thousands of nodes).
   *
   * Strategy: one root call returns the entire tree in a flat list. Each item
   * carries its own code, name, depth and parent code. We do not paginate.
   *
   * Rate limit: domeggook treats getCat as a low-cost call (single shot) but
   * we still respect the shared 180/min bucket. Adapter does not throttle —
   * caller (weekly cron) calls once per week so throttling is moot.
   */
  async getCategories(): Promise<Category[]> {
    const apiKey = await getApiKey();
    if (!apiKey) {
      throw new SourceAdapterError(
        PLATFORM_CODE,
        'AuthFailed',
        'Domeggook API key is not configured (store_settings.domeggook_api_key).',
      );
    }

    const params = new URLSearchParams();
    params.set('ver', '2.0');
    params.set('mode', 'getCat');
    params.set('aid', apiKey);
    params.set('om', 'json');

    let res: Response;
    try {
      res = await fetch(`${DOMEGGOOK_API}?${params.toString()}`, {
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS * 2),
      });
    } catch (e) {
      throw new SourceAdapterError(
        PLATFORM_CODE,
        'Network',
        'Network error in getCategories',
        e,
      );
    }

    if (!res.ok) {
      throw new SourceAdapterError(
        PLATFORM_CODE,
        'BadResponse',
        `getCategories returned HTTP ${res.status}`,
      );
    }

    type RawNode = {
      code?: string | number;
      name?: string;
      depth?: number | string;
      parent?: string | number;
      parentCode?: string | number;
      itemCount?: number | string;
      cnt?: number | string;
    };

    const raw = (await res.json()) as {
      domeggook?: {
        list?: { category?: RawNode[] };
        category?: RawNode[];
      };
      errors?: unknown;
    };

    if (raw.errors || !raw.domeggook) return [];

    const rawList: RawNode[] =
      raw.domeggook.list?.category ?? raw.domeggook.category ?? [];

    return rawList
      .map((node) => {
        const code = String(node.code ?? '').trim();
        const name = (node.name ?? '').trim();
        const depthRaw = node.depth;
        const depth = typeof depthRaw === 'number'
          ? depthRaw
          : parseInt(String(depthRaw ?? '1'), 10) || 1;
        const parent = node.parent ?? node.parentCode;
        const parentCode = parent === undefined || parent === null || parent === ''
          ? null
          : String(parent);
        const cnt = node.itemCount ?? node.cnt ?? 0;
        const itemCount = typeof cnt === 'number'
          ? cnt
          : parseInt(String(cnt), 10) || 0;
        return code && name
          ? ({ code, name, depth, parentCode, itemCount } satisfies Category)
          : null;
      })
      .filter((c): c is Category => c !== null);
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
