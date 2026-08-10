// src/lib/wholesale-matcher.ts
// E-8: Wholesale product matcher for Domeggook + Domemae
// Searches both platforms for products matching recommended keywords
// Filters: min order qty = 1, in-stock, viable margin
// Used by sourcing-recommender.ts to enrich opportunities with real wholesale products

import { prisma } from '@/lib/prisma';
import {
  CATEGORY_MISMATCH_DICT,
  WHITELIST_MODIFIERS,
  HEAD_NOUN_WHITELIST,
  type MismatchAxis,
} from '@/lib/category-mismatch-dict';

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
  priceOutlier: boolean; // #326-B: 이 매칭묶음 내에서 가격이 비정상적으로 벗어남(이종상품 오염 의심)
  // 2026-08-05: 부속품/소모품/호환용품 의심(본품이 아닐 가능성). 예: "가습기"
  // 검색에 "가습기 필터·청소솔", "제습기"에 "습기제거제"가 최저가로 걸린다.
  // priceOutlier(가격 이탈)와 별개 축 — 이건 "상품 종류"가 본품이 아님을 뜻한다.
  // 완전 배제하지 않고(진짜 부속품을 찾는 경우도 있으므로) 후순위+경고만 한다.
  accessoryRisk: boolean;
  // 트랙③ 1단계(2026-08-07): 상품명이 "청소기"→"귀청소기"처럼 다른 카테고리로
  // 전환된 것으로 의심되는 한정어를 포함하는지(사전 기반, category-mismatch-dict.ts).
  // 완전 배제하지 않는다(#327) — 1단계는 필드만 채우고 정렬·표시 반영은 후속 작업.
  categoryMismatch: 'suspect' | null;
  categoryMismatchAxis: MismatchAxis | null;
  categoryMismatchModifier: string | null;
  // 꼬띠 소싱 v2(로드맵 1, 2026-08-10) — 이 상품이 내가 실제 거래 중인
  // 공급사(Supplier.domeggookSellerId)의 것인지. true면 배송·정산·합배송이
  // 이미 세팅돼 있어 마찰 없이 바로 소싱 가능(공급사 프리미엄, 설계 §3-2).
  isMySupplier: boolean;
}

// 토큰 경계를 지킨 "수식어+키워드 접두" 매칭(설계 §5 체크리스트 3번 — 단순
// substring 매칭은 형태소 경계를 무시해 오탐을 낳는다). 실측 발견(2026-08-07):
// 키워드="멀티탭" 상품명 "...와이파이 멀티탭..."에서 공백을 통째로 제거하면
// "...파이멀티탭..."이 되어 축A 한정어 "이"(치아/이)가 "이"+"멀티탭"으로 우연히
// 걸린다 — "이"는 "와이파이"의 마지막 음절일 뿐 신체부위 의미가 아니다. 공백을
// 지우기 전에 토큰(띄어쓰기) 단위로 판정해 이런 교차-토큰 우연 결합을 막는다.
// 단, "차량용 청소기"처럼 수식어와 키워드가 서로 다른 토큰(사이 공백)인 정상
// 패턴은 여전히 잡아야 한다(리서치 §Details 확인된 실사례) — 그래서 "같은 토큰
// 내 접두" + "수식어가 독립 토큰이고 바로 다음 토큰이 키워드로 시작" 두 형태 모두 허용한다.
function hasTokenBoundedPrefixMatch(productName: string, modifier: string, keyword: string): boolean {
  const tokens = productName.trim().split(/\s+/).filter(Boolean);
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    // 같은 토큰 안에 수식어+키워드가 붙어있음(예: "귀청소기", "차량용청소기")
    if (token.includes(modifier + keyword)) return true;
    // 수식어가 그 자체로 독립 토큰이고, 바로 다음 토큰이 키워드로 시작함(예: "차량용 청소기")
    if (token === modifier && tokens[i + 1]?.startsWith(keyword)) return true;
  }
  return false;
}

// 트랙③ 1단계 — 카테고리 전환 한정어 판별(사전만, 도매 API 추가 호출 0).
// 설계: docs/design/KEYWORD_CATEGORY_PRECISION_2026-08-05.md §4-1/§4-4.
// detectAccessoryRisk(위)와 같은 패턴: 상품명이 [블랙리스트 수식어]+[키워드]
// 접두 패턴일 때만(수식어가 head noun 바로 앞, 토큰 경계 준수) 강신호로 판정한다.
export function detectCategoryMismatch(
  productName: string,
  keyword: string,
): {
  mismatch: 'suspect' | null;
  axis: MismatchAxis | null;
  matchedModifier: string | null;
} {
  const normalizedKeyword = keyword.replace(/\s+/g, '');
  const extraWhitelist = HEAD_NOUN_WHITELIST[normalizedKeyword] ?? [];

  for (const [axis, modifiers] of Object.entries(CATEGORY_MISMATCH_DICT) as [MismatchAxis, string[]][]) {
    for (const modifier of modifiers) {
      // 키워드 자체가 이미 그 한정어를 포함하면(예: 키워드="귀청소기") 스킵
      if (normalizedKeyword.includes(modifier)) continue;
      // 화이트리스트(정상 하위속성)가 블랙리스트보다 우선
      if (WHITELIST_MODIFIERS.includes(modifier) || extraWhitelist.includes(modifier)) continue;
      if (hasTokenBoundedPrefixMatch(productName, modifier, normalizedKeyword)) {
        return { mismatch: 'suspect', axis, matchedModifier: modifier };
      }
    }
  }
  return { mismatch: null, axis: null, matchedModifier: null };
}

// 2026-08-05 — 본품 판별용 부속품/소모품/호환용품 신호어(전 상품 공통 시스템).
// 특정 상품을 하드코딩하지 않는다 — 상품명에 이 신호어가 있으면 "본품이 아니라
// 그 상품의 부속품·소모품일 가능성"이 높다는 범용 휴리스틱이다. 도매매칭은
// 키워드 전문검색이라 본품(가습기)을 찾아도 부속품(가습기 필터)이 최저가로
// 섞여 대표 노출되는 구조적 문제가 있어(#326 연장, 실측: 가습기→청소솔 170원,
// 제습기→습기제거제 870원, 청소기→차량유리 걸레 1,000원) 이를 걸러낸다.
const ACCESSORY_SIGNAL_WORDS = [
  // 부속품·부품
  '필터', '브러쉬', '브러시', '청소솔', '커버', '거치대', '받침', '부품',
  '호스', '노즐', '패드', '망', '트레이', '캡', '뚜껑', '스탠드', '홀더',
  '어댑터', '충전기', '배터리', '전용케이스', '파우치', '가방', '스트랩',
  // 소모품
  '제거제', '방향제', '리필', '세정제', '탈취제', '방습제', '습기제거',
  '스티커', '테이프', '건전지', '심지', '카트리지',
  // 호환·전용(다른 본품의 액세서리임을 강하게 시사)
  '호환', '전용', '증정', '사은품',
];

// 상품명이 부속품/소모품 신호어를 포함하는지 — 본품이 아닐 가능성 판별.
// 단, 키워드 자체가 부속품류일 때(예: 키워드가 "필터"·"커버")는 그 신호어를
// 무시한다(그 경우 필터/커버가 본품이므로).
function detectAccessoryRisk(productName: string, keyword: string): boolean {
  const normalizedName = productName.replace(/\s+/g, '');
  const normalizedKeyword = keyword.replace(/\s+/g, '');
  for (const sig of ACCESSORY_SIGNAL_WORDS) {
    // 키워드에 이미 그 신호어가 들어 있으면(예: "가습기필터"를 찾는 중) 스킵
    if (normalizedKeyword.includes(sig)) continue;
    if (normalizedName.includes(sig)) return true;
  }
  return false;
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
  sellerId?: string,
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
    // 꼬띠 소싱 v2(로드맵 1, 2026-08-10) — 공급사 축: id 파라미터로 특정
    // 판매자(공급사)의 상품만 조회. 도매매 OpenAPI v4.1 공식 문서 확인
    // (KKOTTI_DAILY_SOURCING_V2_2026-08-07.md §2) — id는 kw와 함께 써서
    // "이 공급사 안에서 이 키워드에 맞는 상품"으로 범위를 좁힌다.
    if (sellerId) params.set('id', sellerId);

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

      const rawTitle = String(item.title ?? '').replace(/\s+/g, ' ').trim();

      // #326-B(2026-08-04, 캐리어 90원 오염 실사례 — 확인: "캐리어" 검색 상위에
      // 에어컨 브랜드 "캐리어"(Carrier) 리모컨 부속품, 캐리어용 파우치/이너백
      // 등 이종상품 다수 포함). 도매매칭은 전문검색이라 키워드가 상품명에
      // 아예 없는 완전 무관 상품까지 섞이는 걸 막는다 — 상품명에 키워드가
      // 한 글자도 없으면 애초에 이 키워드의 상품이 아니므로 제외한다.
      // 공백 제거 후 비교(★ 실측 발견·2026-08-04): 도매처 상품명은 "캠핑
      // 테이블"처럼 띄어쓰기가 들어간 경우가 많아, 원본 키워드 "캠핑테이블"과
      // 그대로 비교하면 정상 매칭까지 전량 소실된다(실측: 필터 적용 직후
      // 캠핑테이블 매칭 0건으로 확인). 공백을 지우고 비교해 이 문제를 없앤다.
      // 주의: 이건 "이종상품 완전 차단"이 아니라 "완전 무관 상품만 배제"하는
      // 최소 필터다("캐리어 파우치"처럼 키워드를 포함한 연관상품은 여전히
      // 통과 — 그건 priceOutlier 플래그로 별도 표시한다, 아래 참조).
      const normalizedTitle = rawTitle.replace(/\s+/g, '');
      const normalizedKeyword = keyword.replace(/\s+/g, '');
      if (!normalizedTitle.includes(normalizedKeyword)) continue;

      const categoryMismatchResult = detectCategoryMismatch(rawTitle, keyword);

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
        name: rawTitle,
        supplyPrice,
        minOrderQty,
        inventory: 1, // 목록 API는 판매중 상품만 반환 — 정확한 재고수는 제공되지 않음
        shipFee,
        imageUrl: String(item.thumb ?? ''),
        sellerName,
        url: `https://domeme.domeggook.com/s/${productNo}`,
        priceOutlier: false, // 아래에서 매칭묶음 전체 기준으로 재계산
        accessoryRisk: detectAccessoryRisk(rawTitle, keyword),
        categoryMismatch: categoryMismatchResult.mismatch,
        categoryMismatchAxis: categoryMismatchResult.axis,
        categoryMismatchModifier: categoryMismatchResult.matchedModifier,
        isMySupplier: !!sellerId,
      });
    }

    // 2026-08-05 본품 우선 정렬(전 상품 공통): 부속품/소모품 의심(accessoryRisk)이
    // 아닌 "본품"을 먼저 올리고, 그 안에서 공급가 오름차순. 이렇게 하면 "가습기"
    // 검색에서 청소솔(부속품)이 최저가여도 진짜 가습기 본품이 대표로 노출된다.
    // 부속품이 전부인 경우엔 부속품이라도 보여준다(정보 손실 방지).
    const top3 = results
      .sort((a, b) => {
        if (a.accessoryRisk !== b.accessoryRisk) return a.accessoryRisk ? 1 : -1;
        return a.supplyPrice - b.supplyPrice;
      })
      .slice(0, 3);

    // #326-B: 키워드 필터를 통과해도 남는 가격 이상치("캐리어 파우치" 3000원처럼
    // 연관은 있으나 다른 제품)를 지어내지 않고 표시만 한다. 이 3건의 중앙값 대비
    // 5배 이상 벗어나면 이종상품 오염 의심으로 플래그 — 배제는 하지 않는다
    // (배제는 또 다른 추측이 되므로, 판단은 항상 대표님이 링크를 보고 내린다).
    if (top3.length >= 2) {
      const prices = top3.map((p) => p.supplyPrice).sort((a, b) => a - b);
      const median = prices[Math.floor(prices.length / 2)];
      for (const p of top3) {
        if (median > 0 && (p.supplyPrice < median / 5 || p.supplyPrice > median * 5)) {
          p.priceOutlier = true;
        }
      }
    }

    return top3;
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

  // Sort: 본품 우선(accessoryRisk=false 먼저) → 공급가 오름차순. 2026-08-05
  // 전 상품 공통 — 부속품/소모품이 최저가로 대표 노출되는 문제 방지.
  const sorted = deduped
    .sort((a, b) => {
      if (a.accessoryRisk !== b.accessoryRisk) return a.accessoryRisk ? 1 : -1;
      return a.supplyPrice - b.supplyPrice;
    })
    .slice(0, 5);

  return {
    keyword,
    matches: sorted,
    searchedPlatforms,
  };
}

// ── 꼬띠 소싱 v2 로드맵 1(2026-08-10): 공급사 축 ────────────────────────────
// 설계: docs/design/KKOTTI_DAILY_SOURCING_V2_2026-08-07.md §2·§3-1·§6.
// "이 키워드에 맞는 상품 중, 내가 실제 거래하는 공급사가 취급하는 것"을 찾는다.
// 새 API가 아니라 기존 searchDomeggookMarket에 sellerId만 추가해 구현(§2 확인).
// 도매매(supply)만 조회한다 — domeggookSellerId는 도매매 셀러 계정 기준이며
// 도매매·도매꾹은 같은 API 키를 쓰는 동일 계정군이라(DOMAIN_FACTS §1) 우선
// supply만으로 충분하다. 필요시 dome도 추가 가능(현재는 범위 최소화).
export interface SupplierMatchResult {
  supplierId: string;
  supplierName: string;
  matches: WholesaleProduct[];
}

// 내가 거래 중인 공급사들(domeggookSellerId 보유) 중, 주어진 키워드에 맞는
// 상품을 취급하는 공급사만 골라 반환한다. 취급 안 하면 그 공급사는 결과에서
// 제외(빈 배열 억지로 채우지 않음 — #325 정직한 실패).
export async function searchBySupplier(keyword: string): Promise<SupplierMatchResult[]> {
  const suppliers = await prisma.supplier.findMany({
    where: { domeggookSellerId: { not: null } },
    select: { id: true, name: true, domeggookSellerId: true },
  });
  if (suppliers.length === 0) return [];

  const results: SupplierMatchResult[] = [];
  for (const supplier of suppliers) {
    if (!supplier.domeggookSellerId) continue;
    try {
      const matches = await searchDomeggookMarket(keyword, 'supply', supplier.domeggookSellerId);
      if (matches.length > 0) {
        results.push({ supplierId: supplier.id, supplierName: supplier.name, matches });
      }
    } catch { /* best-effort — 한 공급사 실패가 나머지를 막지 않는다(#82) */ }
    // 공급사 간 rate limit(기존 플랫폼 간 300ms 관례와 동일)
    await new Promise(r => setTimeout(r, 300));
  }
  return results;
}

// ── Discord embed helper for wholesale matches ───────────────────────────────

export function buildWholesaleMatchField(result: WholesaleMatchResult): Record<string, unknown> | null {
  if (result.matches.length === 0) return null;

  const lines = result.matches.slice(0, 3).map((p, i) => {
    const platformTag = p.platform === 'DMK' ? 'DMK' : 'DMM';
    // 마진(%)은 지어내지 않는다(SOURCING_NEGATIVE_MARGIN_ROOT_CAUSE 2026-08-04)
    // — 실측 공급가만 표시. priceOutlier(#326-B)는 이종상품 오염 의심을
    // 배제하지 않고 표시만 한다 — 최종 판단은 대표님이 링크를 보고 내린다.
    const outlierNote = p.priceOutlier ? ' :warning: 가격 확인 필요' : '';
    return `${i + 1}. [${platformTag}] 공급가 **${p.supplyPrice.toLocaleString()}원**${outlierNote} | ${p.name.slice(0, 30)}${p.name.length > 30 ? '...' : ''}\n   [보러가기](${p.url})`;
  });

  return {
    name: `:package: "${result.keyword}" wholesale match (${result.searchedPlatforms.join('+')})`,
    value: lines.join('\n'),
    inline: false,
  };
}
