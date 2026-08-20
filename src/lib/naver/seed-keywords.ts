// src/lib/naver/seed-keywords.ts
// P0-4 (2026-08-20): 소싱 발굴 씨앗 키워드 도출 — 취급 상품(Product) +
// 운영자가 StoreSettings에 직접 등록한 씨앗을 합쳐, DataLab 카테고리 인기어
// 대신 "실제 취급군"에서 출발하는 연관확장(searchad-volume.fetchRelatedKeywords)의
// 입력을 만든다. 하드코딩 카테고리 목록 없음 — 전부 DB에서 파생.
//
// 결함수정(2026-08-20, Desktop 리뷰): 씨앗 1순위가 "uncategorized"·풀 카테고리
// 경로로 오염되고, naver_keywords(상황어: 집들이선물·이사·결혼)가 상품과
// 무관한 연관확장을 끌어오던 문제 수정. 씨앗 우선순위를 상품명 핵심어 중심으로
// 재설계했다(아래 resolveSourcingSeeds 주석 참조).

import { prisma } from '@/lib/prisma';
import { extractNouns } from '@/lib/strategy/morpheme-tokenizer';
import { fetchKeywordVolumes, normalizeKeyword } from '@/lib/naver/searchad-volume';

export interface SourcingSeed {
  keyword: string;
  source: 'store_settings' | 'product_name' | 'category' | 'naver_keyword';
}

const MAX_SEEDS = 5; // SearchAd hintKeywords 배치 한도와 맞춤(1회 호출)

// 결함2 수정(2026-08-20, Desktop 실 DB 검증): nouns[0]("첫 명사")을 headword로
// 쓰던 이전 구현은 "수식어+본체어" 구조인 한국어 상품명에서 항상 수식어를
// 잡았다("듀얼 무선 가습기..." → "듀얼"). 숫자+단위 토큰("64구"·"2colors")도
// GENERIC_MODIFIERS 사전엔 없는 패턴이라 명사로 통과한다 — 여기서 별도 차단.
const NUMERIC_UNIT_PATTERN = /^\d+(구|단|colors?|p|개|종)$/i;

// SearchAd 자기검증 임계값(월 검색량 합, PC+모바일). 미만이면 "상품명에서
// 뽑혔지만 시장에서 검색되지 않는 토큰"으로 보고 탈락시킨다(예: 64구=0,
// 저소음=210, 실용적인=300 — 전부 이 임계값 밑에서 걸러진다).
const SEED_MIN_VOLUME = 500;
// 검증 API 호출 비용을 제한하기 위해 빈도 상위 N개까지만 검증한다.
const SEED_VERIFY_TOP_N = 10;

// category/naver_keywords에서 뽑힌 값이 씨앗으로 쓸모없는 경우를 하드 차단한다.
// 'uncategorized'는 미분류 상품에 코드가 자동 부여하는 값이라 씨앗 1순위를
// 잠식했던 실측 결함(2026-08-20) — 대소문자 무관하게 걸러야 한다.
const BLOCKED_SEEDS = new Set(['uncategorized', '미분류', '기타', 'etc']);

function isBlockedSeed(k: string): boolean {
  const t = k.trim().toLowerCase();
  return t.length === 0 || BLOCKED_SEEDS.has(t);
}

/** category가 "생활/건강 > 주방용품 > 보관/밀폐용기" 같은 " > " 경로면 마지막
 *  마디만 씨앗으로 쓴다 — 풀 경로를 통째로 SearchAd hintKeywords에 넣으면
 *  연관검색 매칭이 거의 안 된다. 길이 상한(15자)은 마지막 마디 추출 후 적용. */
function lastCategorySegment(category: string): string | null {
  const parts = category.split('>').map(s => s.trim()).filter(Boolean);
  const last = parts[parts.length - 1] ?? '';
  if (isBlockedSeed(last) || last.length < 2 || last.length > 15) return null;
  return last;
}

/** extractNouns()가 뽑은 명사 목록에서 headword 후보를 고른다. 한국어 상품명은
 *  "수식어 + 본체어" 구조라 본체어가 대개 뒤쪽에 온다(Desktop 실측: "듀얼 무선
 *  가습기"→가습기, "64구 아이스트레이 얼음보관함"→아이스트레이, "라이트 LED
 *  저소음 사무실 가습기"→가습기 — 전부 후반부) — 그래서 뒤에서부터 순회한다.
 *  숫자+단위 토큰(64구·2colors 등)은 여기서 추가로 걸러낸다(GENERIC_MODIFIERS
 *  사전은 고정 단어 목록이라 이 패턴을 못 잡는다). */
function candidateHeadwordsFromName(name: string): string[] {
  const { nouns } = extractNouns(name);
  const reversed = [...nouns].reverse();
  return reversed.filter(n =>
    !isBlockedSeed(n) && n.length <= 15 && !NUMERIC_UNIT_PATTERN.test(n)
  );
}

/** ACTIVE/DRAFT 상품명에서 핵심어(headword)를 추출해 빈도순으로 뽑은 뒤,
 *  SearchAd 실측 검색량으로 자기검증한다(결함2, 2026-08-20). 형태소 분석을
 *  완벽하게 만들려 하지 않고 — 상위 후보 SEED_VERIFY_TOP_N개를 기존
 *  fetchKeywordVolumes(searchad-volume.ts, 신규 API 로직 아님)에 던져 월
 *  검색량 합이 SEED_MIN_VOLUME 미만인 후보(예: 64구=0, 실용적인=300)를
 *  탈락시킨다 — 형태소 후보가 아무리 그럴듯해도 시장에서 검색 안 되면 씨앗으로
 *  못 쓴다는 원칙. SearchAd 자체가 불가능하면(env 미설정 등) 검증 없이 순위만
 *  신뢰하지 않고 빈 배열을 반환해 상위 호출부가 DataLab 폴백을 타게 한다
 *  (쓰레기 씨앗으로 진행 금지 — 운영자 지침). */
async function seedsFromProductNames(): Promise<string[]> {
  const products = await prisma.product.findMany({
    where: { status: { in: ['ACTIVE', 'DRAFT'] } },
    select: { name: true },
    orderBy: { updatedAt: 'desc' },
    take: 100,
  }).catch(() => []);

  const counts = new Map<string, number>();
  for (const p of products) {
    if (!p.name) continue;
    const headword = candidateHeadwordsFromName(p.name)[0];
    if (!headword) continue;
    counts.set(headword, (counts.get(headword) ?? 0) + 1);
  }

  const ranked = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([k]) => k);
  if (ranked.length === 0) return [];

  const topCandidates = ranked.slice(0, SEED_VERIFY_TOP_N);
  const volumeRows = await fetchKeywordVolumes(topCandidates).catch(() => null);
  if (volumeRows === null) return [];

  const volumeByKeyword = new Map<string, number>();
  for (const r of volumeRows) {
    volumeByKeyword.set(normalizeKeyword(r.keyword), r.totalMonthlyQc);
  }
  return topCandidates
    .filter(k => (volumeByKeyword.get(normalizeKeyword(k)) ?? 0) >= SEED_MIN_VOLUME)
    .sort((a, b) => (volumeByKeyword.get(normalizeKeyword(b)) ?? 0) - (volumeByKeyword.get(normalizeKeyword(a)) ?? 0));
}

/** ACTIVE/DRAFT 상품의 category(D1) 마지막 마디에서 씨앗 후보를 뽑는다.
 *  상품명 핵심어로 5개를 못 채웠을 때만 보충으로 쓴다. */
async function seedsFromCategories(): Promise<string[]> {
  const products = await prisma.product.findMany({
    where: { status: { in: ['ACTIVE', 'DRAFT'] } },
    select: { category: true },
    orderBy: { updatedAt: 'desc' },
    take: 100,
  }).catch(() => []);

  const counts = new Map<string, number>();
  for (const p of products) {
    if (!p.category) continue;
    const seg = lastCategorySegment(p.category);
    if (!seg) continue;
    counts.set(seg, (counts.get(seg) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([k]) => k);
}

/** naver_keywords는 SEO 유입용 상황어(집들이선물·이사·결혼 등)라 연관확장의
 *  최후 폴백으로만 쓴다 — "결혼" 연관확장이 청첩장·예물처럼 드롭십과 무관한
 *  결과를 끌어온 실측 결함(2026-08-20) 때문에 우선순위를 가장 낮춘다. */
async function seedsFromNaverKeywords(): Promise<string[]> {
  const products = await prisma.product.findMany({
    where: { status: { in: ['ACTIVE', 'DRAFT'] } },
    select: { naver_keywords: true },
    orderBy: { updatedAt: 'desc' },
    take: 100,
  }).catch(() => []);

  const counts = new Map<string, number>();
  for (const p of products) {
    if (!p.naver_keywords) continue;
    for (const raw of p.naver_keywords.split(/[,\s]+/)) {
      const t = raw.trim();
      if (isBlockedSeed(t) || t.length < 2 || t.length > 15) continue;
      counts.set(t, (counts.get(t) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([k]) => k);
}

/** StoreSettings.sourcingSeedKeywords — 운영자가 직접 추가한 씨앗(신규 취급군
 *  등, 아직 상품이 없어 Product에서 파생되지 않는 것도 포함 가능).
 *
 *  컬럼 부재(DDL 미실행)와 값 없음(정상, 빈 배열)을 구분해 로그를 남긴다 —
 *  기존엔 .catch(()=>null) 하나로 둘 다 조용히 삼켜 배포 순서가 꼬이면 아무도
 *  모르게 죽어 있었다(결함3, Desktop 리뷰 2026-08-20). */
async function seedsFromStoreSettings(): Promise<string[]> {
  let settings: { sourcingSeedKeywords?: unknown } | null = null;
  try {
    settings = await (prisma as any).storeSettings.findUnique({
      where: { id: 'default' },
      select: { sourcingSeedKeywords: true },
    });
  } catch (e) {
    // 컬럼 부재(DDL 미실행) 등 스키마 불일치는 조용히 삼키지 않고 경고 로그로
    // 남긴다 — 운영자가 원인을 알 수 있게.
    console.warn('[seed-keywords] storeSettings.sourcingSeedKeywords 조회 실패 (컬럼 미배포 가능성):', e);
    return [];
  }

  const raw = settings?.sourcingSeedKeywords;
  if (!Array.isArray(raw)) return [];
  return raw.filter((k): k is string => typeof k === 'string' && k.trim().length >= 2);
}

/**
 * 소싱 씨앗 키워드를 최대 MAX_SEEDS개 반환한다.
 * 우선순위(결함1·2 수정, Desktop 리뷰 2026-08-20):
 *   1) 운영자 수동 등록(store_settings)
 *   2) 상품명 핵심어(product_name, 빈도순) — "무엇을 파는지"를 가장 직접 반영
 *   3) category 마지막 마디(category) — 핵심어로 부족할 때 보충
 *   4) naver_keywords(situational, 상황어) — 그래도 부족할 때만 최후 보충
 * 씨앗이 하나도 없으면(신규 스토어) 빈 배열 — 호출부가 기존 DataLab
 * 카테고리 방식으로 폴백한다(조용히 빈 결과를 내지 않음). 쓰레기 씨앗으로
 * 억지 진행하느니 이 폴백이 낫다(운영자 지침).
 */
export async function resolveSourcingSeeds(): Promise<SourcingSeed[]> {
  const seen = new Set<string>();
  const out: SourcingSeed[] = [];

  const push = (keywords: string[], source: SourcingSeed['source']) => {
    for (const k of keywords) {
      if (seen.has(k)) continue;
      seen.add(k);
      out.push({ keyword: k, source });
      if (out.length >= MAX_SEEDS) return;
    }
  };

  push(await seedsFromStoreSettings(), 'store_settings');
  if (out.length >= MAX_SEEDS) return out;

  push(await seedsFromProductNames(), 'product_name');
  if (out.length >= MAX_SEEDS) return out;

  push(await seedsFromCategories(), 'category');
  if (out.length >= MAX_SEEDS) return out;

  push(await seedsFromNaverKeywords(), 'naver_keyword');
  return out;
}
