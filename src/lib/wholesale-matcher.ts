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

      // SOURCING_NEGATIVE_MARGIN_ROOT_CAUSE(#324 정신 연장, 2026-08-04):
      // 도매매칭은 "키워드 전문검색"이라 같은 검색어라도 이종 상품이 섞인다
      // (예: "텐트" 검색에 캠핑용 샌드팩이 걸림). 호출부가 그 중 최저가 1건을
      // "이 키워드의 대표 판매가"로 역산해 전체 마진을 계산하던 과거 로직은
      // 이종상품 오염으로 마이너스 수백%가 나올 수 있어 폐기했다(문서 §1-§3).
      // 마진(%)은 지어내지 않는다 — 이 함수는 실측 공급가만 반환하고, 판매가
      // 추정·마진 계산은 하지 않는다.

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
      });
    }

    // 공급가 오름차순(저렴한 순) 상위 3건 — 마진 정렬 폐기(위 주석 참조)
    return results.sort((a, b) => a.supplyPrice - b.supplyPrice).slice(0, 3);
  } catch {
    return [];
  }
}

// ── 메인 도매매칭 ─────────────────────────────────────────────────────────────
// DOMAIN_FACTS §1 "도매매(DMM) 우선, 도매꾹(DMK) 폴백"에 맞춰 supply를 1차,
// dome을 2차로 호출한다.

export async function matchWholesaleProducts(
  keyword: string,
): Promise<WholesaleMatchResult> {
  const searchedPlatforms: string[] = [];
  const allMatches: WholesaleProduct[] = [];

  try {
    const dmmResults = await searchDomeggookMarket(keyword, 'supply');
    allMatches.push(...dmmResults);
    searchedPlatforms.push('DMM');
  } catch { /* silent */ }

  // 플랫폼 검색 간 rate limit
  await new Promise(r => setTimeout(r, 300));

  try {
    const dmkResults = await searchDomeggookMarket(keyword, 'dome');
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

  // Sort by supply price ascending (cheapest first) — margin sort retired
  const sorted = deduped.sort((a, b) => a.supplyPrice - b.supplyPrice).slice(0, 5);

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
    // 마진(%)은 지어내지 않는다(SOURCING_NEGATIVE_MARGIN_ROOT_CAUSE 2026-08-04)
    // — 실측 공급가만 표시.
    return `${i + 1}. [${platformTag}] 공급가 **${p.supplyPrice.toLocaleString()}원** | ${p.name.slice(0, 30)}${p.name.length > 30 ? '...' : ''}\n   [보러가기](${p.url})`;
  });

  return {
    name: `:package: "${result.keyword}" wholesale match (${result.searchedPlatforms.join('+')})`,
    value: lines.join('\n'),
    inline: false,
  };
}
