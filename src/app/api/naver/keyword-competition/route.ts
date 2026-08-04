// src/app/api/naver/keyword-competition/route.ts
// GET /api/naver/keyword-competition?name=<상품명>
// NAME-DIAG-2 (#151/#62): for the product name's head keyword + longtail
// candidates, return measured 검색량(SearchAd) + 상품수(Shopping) + 경쟁강도
// (상품수÷검색량) so the UI can recommend a low-competition longtail swap.
//
// HONEST BY CONSTRUCTION (STEP0 / workrule #46): search volume comes from the
// Naver SearchAd API — if its credentials fail, we return success:false with the
// real error, NEVER fabricated numbers. Product counts are best-effort per row
// (null on failure), also never faked.

import { NextRequest, NextResponse } from 'next/server';
import { fetchKeywordStats } from '@/lib/naver/keyword-api';
import { searchShopping } from '@/lib/naver/shopping-search';
import {
  extractMainKeywordTokens,
  buildLongtailCandidates,
  competitionBand,
  type KeywordCompetition,
} from '@/lib/seo/product-name-diagnosis';

export const dynamic = 'force-dynamic';

const CACHE = new Map<string, { data: unknown; ts: number }>();
const TTL = 6 * 60 * 60 * 1000; // 6h — search/shop counts drift slowly

async function fetchProductCount(keyword: string): Promise<number | null> {
  try {
    const r = await searchShopping(keyword, { display: 1 });
    return typeof r.total === 'number' ? r.total : null;
  } catch {
    return null; // best-effort; never fabricate
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const name = (searchParams.get('name') ?? '').trim();
  if (!name) {
    return NextResponse.json({ success: false, error: 'name parameter required' }, { status: 400 });
  }

  // NAME-DIAG-2.1 (#152): the head candidate pool is the CATEGORY-VALIDATED
  // golden keywords / seller tags (ctx.keywords), NOT raw name tokens — so a
  // high-volume cross-category token (e.g. 에어컨 = appliance) on a 방향제
  // product can't be chosen as the head. Falls back to name tokens only when no
  // keywords were supplied.
  const keywords = (searchParams.get('keywords') ?? '')
    .split(',').map(k => k.trim()).filter(Boolean);
  const tokens = extractMainKeywordTokens(name);
  const headPool = (keywords.length > 0 ? keywords : tokens).slice(0, 5);
  if (headPool.length === 0) {
    return NextResponse.json({ success: false, error: '분석할 키워드가 없어요. 상품명을 입력해 주세요.' }, { status: 400 });
  }

  const cacheKey = headPool.join('|');
  const cached = CACHE.get(cacheKey);
  if (cached && Date.now() - cached.ts < TTL) {
    return NextResponse.json({ success: true, cached: true, ...(cached.data as object) });
  }

  const volMap = new Map<string, number>();

  // Round 1: measure the head pool and pick the HIGHEST-VOLUME entry as the head
  // keyword — the term shoppers actually search. SearchAd is essential: if it
  // hard-fails we report it honestly, never fabricate volumes.
  try {
    const stats = await fetchKeywordStats(headPool);
    for (const s of stats) volMap.set(s.keyword.toLowerCase(), s.totalMonthly);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { success: false, error: `검색량 데이터를 불러올 수 없어요 (네이버 검색광고 API: ${msg})` },
      { status: 502 },
    );
  }

  let main = headPool[0];
  let bestVol = -1;
  for (const t of headPool) {
    const v = volMap.get(t.toLowerCase()) ?? -1;
    if (v > bestVol) { bestVol = v; main = t; }
  }

  const candidates = buildLongtailCandidates(main, 4);

  // Round 2: candidate volumes (best-effort — candidates may be 0-volume).
  // #270: 무음 실패 금지 — 실패해도 rows는 "데이터 없음"으로 정상 표시되지만,
  // 실패 사실 자체는 응답에 남겨 호출부가 원인을 구분할 수 있게 한다.
  let candidateVolumeFailed = false;
  try {
    const candStats = await fetchKeywordStats(candidates);
    for (const s of candStats) volMap.set(s.keyword.toLowerCase(), s.totalMonthly);
  } catch {
    candidateVolumeFailed = true;
  }

  const allKeywords = [main, ...candidates];
  const counts = await Promise.all(allKeywords.map(fetchProductCount));
  // SE05(#324): 쇼핑검색(shop.json)이 2026-07-31 영구 종료돼 fetchProductCount는
  // 이제 항상 null을 반환한다(searchShopping 404 → catch → null, "가짜값 금지"
  // 원칙에 따라 이미 정직하게 동작 중). 매번 조용히 비는 대신 그 사실을 명시한다.
  const productCountFailures = counts.filter((c) => c === null).length;

  const rows: KeywordCompetition[] = allKeywords.map((kw, i) => {
    const searchVolume = volMap.get(kw.toLowerCase()) ?? null;
    const productCount = counts[i];
    const ratio = (searchVolume != null && searchVolume > 0 && productCount != null)
      ? Math.round((productCount / searchVolume) * 10) / 10
      : null;
    return { keyword: kw, searchVolume, productCount, ratio, band: competitionBand(ratio) };
  });

  const mainRow = rows[0];
  const candidateRows = rows
    .slice(1)
    .map(r => ({ ...r, recommended: r.band != null && r.band !== 'high' && (r.searchVolume ?? 0) > 0 }))
    .sort((a, b) => Number(b.recommended) - Number(a.recommended) || ((a.ratio ?? Infinity) - (b.ratio ?? Infinity)));

  const data = {
    main: mainRow,
    candidates: candidateRows,
    ...(candidateVolumeFailed ? { candidateVolumeFailed: true } : {}),
    ...(productCountFailures === allKeywords.length
      ? { productCountNote: '네이버 쇼핑검색 API 종료(2026-07-31)로 상품수 데이터를 가져올 수 없어요. 경쟁 판정은 검색량 기준으로만 참고해 주세요.' }
      : {}),
  };

  if (CACHE.size >= 300) {
    const oldest = [...CACHE.entries()].sort((a, b) => a[1].ts - b[1].ts)[0];
    if (oldest) CACHE.delete(oldest[0]);
  }
  CACHE.set(cacheKey, { data, ts: Date.now() });

  return NextResponse.json({ success: true, cached: false, ...data });
}
