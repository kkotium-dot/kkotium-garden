// src/lib/wholesale-matcher.ts
// E-8: Wholesale product matcher for Domeggook + Domemae
// Searches both platforms for products matching recommended keywords
// Filters: min order qty = 1, in-stock, viable margin
// Used by sourcing-recommender.ts to enrich opportunities with real wholesale products

import { prisma } from '@/lib/prisma';

// ── Types ────────────────────────────────────────────────────────────────────

export interface WholesaleProduct {
  platform: 'DMK' | 'DMM';
  productNo: string;
  name: string;
  supplyPrice: number;
  minOrderQty: number;
  inventory: number;
  shipFee: number;
  imageUrl: string;
  sellerName: string;
  url: string;
  estimatedMargin: number; // calculated vs Naver avg price
}

export interface WholesaleMatchResult {
  keyword: string;
  matches: WholesaleProduct[];
  searchedPlatforms: string[];
  error?: string;
}

// ── Domeggook OpenAPI search ─────────────────────────────────────────────────
// API: https://domeggook.com/ssl/api/?ver=4.5&mode=getItemList
// Returns list of products matching keyword
// Filter: supplyUnit = 1 (minimum order 1 piece)

const DOMEGGOOK_API = 'https://domeggook.com/ssl/api/';

async function getApiKey(): Promise<string | null> {
  try {
    const rows = await prisma.$queryRaw<{ domeggook_api_key: string }[]>`
      SELECT domeggook_api_key FROM store_settings WHERE id = 'default' LIMIT 1
    `;
    const key = rows[0]?.domeggook_api_key?.trim();
    return key || null;
  } catch { return null; }
}

function parseSupplyPrice(val: unknown): number {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const first = val.split('|')[0];
    const price = parseInt(first.split('+')[1] ?? first, 10);
    return isNaN(price) ? 0 : price;
  }
  return 0;
}

interface DomeggookListItem {
  no?: string | number;
  title?: string;
  price?: { supply?: unknown };
  qty?: { inventory?: number; supplyUnit?: number };
  deli?: { supply?: { fee?: unknown; type?: string } };
  thumb?: { large?: string; largePng?: string };
  seller?: { nick?: string; id?: string; company?: { name?: string } };
}

async function searchDomeggook(keyword: string, avgNaverPrice: number): Promise<WholesaleProduct[]> {
  const apiKey = await getApiKey();
  if (!apiKey) return [];

  try {
    // Domeggook OpenAPI getItemList with keyword search
    const params = new URLSearchParams({
      ver: '4.5',
      mode: 'getItemList',
      aid: apiKey,
      keyword: keyword,
      om: 'json',
      display: '20',
      sort: 'pop', // sort by popularity
    });

    const res = await fetch(`${DOMEGGOOK_API}?${params}`, {
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) return [];

    const raw = await res.json();
    const items: DomeggookListItem[] = raw?.domeggook?.list ?? raw?.domeggook ?? [];

    if (!Array.isArray(items)) return [];

    const results: WholesaleProduct[] = [];

    for (const item of items) {
      const supplyUnit = item.qty?.supplyUnit ?? 1;

      // CRITICAL FILTER: only products with min order qty = 1
      if (supplyUnit !== 1) continue;

      const supplyPrice = parseSupplyPrice(item.price?.supply);
      if (supplyPrice <= 0) continue;

      const inventory = item.qty?.inventory ?? 0;
      if (inventory <= 0) continue;

      // Calculate estimated margin vs Naver average price
      const naverFeeRate = 0.058; // 5.8% total Naver fees
      const estimatedMargin = avgNaverPrice > 0
        ? Math.round(((avgNaverPrice - supplyPrice - avgNaverPrice * naverFeeRate) / avgNaverPrice) * 100)
        : 0;

      // Only include products with viable margin (>= 15%)
      if (estimatedMargin < 15) continue;

      const shipFeeRaw = item.deli?.supply?.fee;
      const shipType = item.deli?.supply?.type;
      const shipFee = shipType === '\uBB34\uB8CC\uBC30\uC1A1' ? 0 :
        typeof shipFeeRaw === 'number' ? shipFeeRaw :
        typeof shipFeeRaw === 'string' ? parseInt(shipFeeRaw, 10) || 3000 : 3000;

      const productNo = String(item.no ?? '');
      const sellerName = String(
        (item.seller as any)?.company?.name ||
        item.seller?.nick || ''
      );

      results.push({
        platform: 'DMK',
        productNo,
        name: String(item.title ?? '').replace(/\s+/g, ' ').trim(),
        supplyPrice,
        minOrderQty: supplyUnit,
        inventory,
        shipFee,
        imageUrl: item.thumb?.largePng ?? item.thumb?.large ?? '',
        sellerName,
        url: `https://domeme.domeggook.com/s/${productNo}`,
        estimatedMargin,
      });
    }

    // Sort by margin desc, take top 3
    return results.sort((a, b) => b.estimatedMargin - a.estimatedMargin).slice(0, 3);
  } catch {
    return [];
  }
}

// ── Domemae web search (HTML scraping fallback) ──────────────────────────────
// Domemae uses the same Domeggook backend but with different URL structure
// We search via the Domeggook API which covers both platforms

async function searchDomemae(keyword: string, avgNaverPrice: number): Promise<WholesaleProduct[]> {
  // Domemae search via web — fetch search results page
  try {
    const searchUrl = `https://domeme.domeggook.com/main/index.php?log=search&keyword=${encodeURIComponent(keyword)}`;

    const res = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html',
        'Accept-Language': 'ko-KR,ko;q=0.9',
      },
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) return [];

    const html = await res.text();

    // Extract product cards from search results
    // Pattern: <a href="/s/XXXXXXXX" ... data-price="XXXX" ...>
    const productPattern = /href="\/s\/(\d{6,10})"[^>]*>[\s\S]*?<span[^>]*class="[^"]*price[^"]*"[^>]*>([\d,]+)/g;
    const matches: WholesaleProduct[] = [];
    let match;
    let count = 0;

    while ((match = productPattern.exec(html)) !== null && count < 10) {
      const productNo = match[1];
      const priceStr = match[2].replace(/,/g, '');
      const supplyPrice = parseInt(priceStr, 10);
      if (isNaN(supplyPrice) || supplyPrice <= 0) continue;

      const naverFeeRate = 0.058;
      const estimatedMargin = avgNaverPrice > 0
        ? Math.round(((avgNaverPrice - supplyPrice - avgNaverPrice * naverFeeRate) / avgNaverPrice) * 100)
        : 0;

      if (estimatedMargin < 15) continue;

      // Extract product name nearby (simplified)
      const nameMatch = html.substring(match.index, match.index + 500).match(/title="([^"]+)"/);
      const name = nameMatch?.[1]?.replace(/\s+/g, ' ').trim() ?? '';

      matches.push({
        platform: 'DMM',
        productNo,
        name: name || `DMM-${productNo}`,
        supplyPrice,
        minOrderQty: 1, // Domemae generally allows single-item purchase
        inventory: 99, // not available from search page
        shipFee: 3000, // default estimate
        imageUrl: '',
        sellerName: '',
        url: `https://domeme.domeggook.com/s/${productNo}`,
        estimatedMargin,
      });
      count++;
    }

    return matches.sort((a, b) => b.estimatedMargin - a.estimatedMargin).slice(0, 3);
  } catch {
    return [];
  }
}

// ── Main wholesale matcher ───────────────────────────────────────────────────

export async function matchWholesaleProducts(
  keyword: string,
  avgNaverPrice: number
): Promise<WholesaleMatchResult> {
  const searchedPlatforms: string[] = [];
  const allMatches: WholesaleProduct[] = [];

  // Search Domeggook (API-based, more reliable)
  try {
    const dmkResults = await searchDomeggook(keyword, avgNaverPrice);
    allMatches.push(...dmkResults);
    searchedPlatforms.push('DMK');
  } catch { /* silent */ }

  // Rate limit between platform searches
  await new Promise(r => setTimeout(r, 300));

  // Search Domemae (web scraping)
  try {
    const dmmResults = await searchDomemae(keyword, avgNaverPrice);
    allMatches.push(...dmmResults);
    searchedPlatforms.push('DMM');
  } catch { /* silent */ }

  // Deduplicate by productNo (same product on both platforms)
  const seen = new Set<string>();
  const deduped = allMatches.filter(p => {
    if (seen.has(p.productNo)) return false;
    seen.add(p.productNo);
    return true;
  });

  // Sort by margin, take top 5
  const sorted = deduped.sort((a, b) => b.estimatedMargin - a.estimatedMargin).slice(0, 5);

  return {
    keyword,
    matches: sorted,
    searchedPlatforms,
  };
}

// ── Discord embed helper for wholesale matches ───────────────────────────────

export function buildWholesaleMatchField(result: WholesaleMatchResult): Record<string, unknown> | null {
  if (result.matches.length === 0) return null;

  const lines = result.matches.slice(0, 3).map((p, i) => {
    const platformTag = p.platform === 'DMK' ? 'DMK' : 'DMM';
    const marginIcon = p.estimatedMargin >= 30 ? ':green_heart:' : p.estimatedMargin >= 20 ? ':yellow_heart:' : ':orange_heart:';
    return `${i + 1}. [${platformTag}] **${p.supplyPrice.toLocaleString()}** ${marginIcon}${p.estimatedMargin}% | ${p.name.slice(0, 30)}${p.name.length > 30 ? '...' : ''}\n   [view](${p.url})`;
  });

  return {
    name: `:package: "${result.keyword}" wholesale match (${result.searchedPlatforms.join('+')})`,
    value: lines.join('\n'),
    inline: false,
  };
}
