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

// ── 도매꾹/도매매 통합 OpenAPI 검색 ────────────────────────────────────────────
// API: https://domeggook.com/ssl/api/?ver=4.1&mode=getItemList&market=dome|supply
// 근본원인 규명: docs/research/DOMEGGOOK_API_404_ROOT_CAUSE_2026-08-04.md
// v4.0에서 getItemList Request/Response가 평면 구조로 전면 개편됨 — v4.5는
// getItemView(단건) 전용이라 getItemList에 존재하지 않아 404를 유발했었다.
// market 값만 다를 뿐 도매꾹(dome)·도매매(supply)는 동일 API·동일 키를 쓴다.

const DOMEGGOOK_API = 'https://domeggook.com/ssl/api/';

type DomeggookMarket = 'dome' | 'supply';

async function getApiKey(): Promise<string | null> {
  try {
    const rows = await prisma.$queryRaw<{ domeggook_api_key: string }[]>`
      SELECT domeggook_api_key FROM store_settings WHERE id = 'default' LIMIT 1
    `;
    const key = rows[0]?.domeggook_api_key?.trim();
    return key || null;
  } catch { return null; }
}

// getItemList 응답은 평면 스키마 — item.price/unitQty/thumb/nick/deli.who,fee
interface DomeggookListItem {
  no?: string | number;
  title?: string;
  price?: unknown;
  unitQty?: unknown;
  deli?: { who?: string; fee?: unknown };
  thumb?: unknown;
  nick?: string;
  id?: string;
}

async function searchDomeggookMarket(
  keyword: string,
  avgNaverPrice: number,
  market: DomeggookMarket,
): Promise<WholesaleProduct[]> {
  const apiKey = await getApiKey();
  if (!apiKey) return [];

  try {
    const params = new URLSearchParams({
      ver: '4.1',
      mode: 'getItemList',
      aid: apiKey,
      market,
      om: 'json',
      kw: keyword,
      sz: '50',
      pg: '1',
      so: 'ha',
      mnq: '1',
      mxq: '1',
    });

    const res = await fetch(`${DOMEGGOOK_API}?${params}`, {
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) return [];

    const raw = await res.json();
    if (raw?.errors) return [];

    const rawItems = raw?.domeggook?.list?.item;
    const items: DomeggookListItem[] = Array.isArray(rawItems)
      ? rawItems
      : rawItems ? [rawItems] : [];

    const platform: WholesaleProduct['platform'] = market === 'supply' ? 'DMM' : 'DMK';
    const results: WholesaleProduct[] = [];

    for (const item of items) {
      const minOrderQty = Number(item.unitQty);
      // 최소구매수량 1개(단건 구매 가능)만 채택
      if (minOrderQty !== 1) continue;

      const supplyPrice = Number(item.price);
      if (!Number.isFinite(supplyPrice) || supplyPrice <= 0) continue;

      // 목록 API는 판매중지·품절·단종을 제외하고 반환하므로 재고 필터 불필요
      // (docs/research/DOMEGGOOK_API_404_ROOT_CAUSE_2026-08-04.md §3-2).

      // SE05(#324): 호출부가 판매가를 모를 때(avgNaverPrice<=0)는 마진을 0으로
      // 지어내지 않는다 — -1(미확인) sentinel로 두고 15% 필터도 건너뛴다. 호출부가
      // 이 도매가로 판매가를 역산한 뒤 실제 마진을 재계산해 채워 넣는다.
      const naverFeeRate = 0.058; // 네이버 수수료 총 5.8%
      const estimatedMargin = avgNaverPrice > 0
        ? Math.round(((avgNaverPrice - supplyPrice - avgNaverPrice * naverFeeRate) / avgNaverPrice) * 100)
        : -1;

      // 마진 15% 이상만 채택 — 마진 미확인(-1)일 때는 이 필터를 건너뛴다.
      if (estimatedMargin >= 0 && estimatedMargin < 15) continue;

      const shipFee = item.deli?.who === 'S' ? 0 : parseInt(String(item.deli?.fee), 10) || 3000;
      const productNo = String(item.no ?? '');
      const sellerName = String(item.nick ?? item.id ?? '');

      results.push({
        platform,
        productNo,
        name: String(item.title ?? '').replace(/\s+/g, ' ').trim(),
        supplyPrice,
        minOrderQty,
        inventory: 1, // 목록 API는 판매중 상품만 반환 — 정확한 재고수는 제공되지 않음
        shipFee,
        imageUrl: String(item.thumb ?? ''),
        sellerName,
        url: `https://domeme.domeggook.com/s/${productNo}`,
        estimatedMargin,
      });
    }

    // 마진 내림차순 상위 3건
    return results.sort((a, b) => b.estimatedMargin - a.estimatedMargin).slice(0, 3);
  } catch {
    return [];
  }
}

// ── 메인 도매매칭 ─────────────────────────────────────────────────────────────
// DOMAIN_FACTS §1 "도매매(DMM) 우선, 도매꾹(DMK) 폴백"에 맞춰 supply를 1차,
// dome을 2차로 호출한다.

export async function matchWholesaleProducts(
  keyword: string,
  avgNaverPrice: number
): Promise<WholesaleMatchResult> {
  const searchedPlatforms: string[] = [];
  const allMatches: WholesaleProduct[] = [];

  try {
    const dmmResults = await searchDomeggookMarket(keyword, avgNaverPrice, 'supply');
    allMatches.push(...dmmResults);
    searchedPlatforms.push('DMM');
  } catch { /* silent */ }

  // 플랫폼 검색 간 rate limit
  await new Promise(r => setTimeout(r, 300));

  try {
    const dmkResults = await searchDomeggookMarket(keyword, avgNaverPrice, 'dome');
    allMatches.push(...dmkResults);
    searchedPlatforms.push('DMK');
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
