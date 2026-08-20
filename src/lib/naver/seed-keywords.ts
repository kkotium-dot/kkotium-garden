// src/lib/naver/seed-keywords.ts
// P0-4 (2026-08-20): 소싱 발굴 씨앗 키워드 도출 — 취급 상품(Product) +
// 운영자가 StoreSettings에 직접 등록한 씨앗을 합쳐, DataLab 카테고리 인기어
// 대신 "실제 취급군"에서 출발하는 연관확장(searchad-volume.fetchRelatedKeywords)의
// 입력을 만든다. 하드코딩 카테고리 목록 없음 — 전부 DB에서 파생.

import { prisma } from '@/lib/prisma';

export interface SourcingSeed {
  keyword: string;
  source: 'product' | 'store_settings';
}

const MAX_SEEDS = 5; // SearchAd hintKeywords 배치 한도와 맞춤(1회 호출)

/** ACTIVE/DRAFT 상품의 category(D1)·naver_keywords에서 씨앗 후보를 뽑는다.
 *  상품명 자체는 너무 구체적(사이즈·색상 등)이라 씨앗으로 쓰지 않는다 —
 *  category와 등록된 naver_keywords만 사용한다. */
async function seedsFromProducts(): Promise<string[]> {
  const products = await prisma.product.findMany({
    where: { status: { in: ['ACTIVE', 'DRAFT'] } },
    select: { category: true, naver_keywords: true },
    orderBy: { updatedAt: 'desc' },
    take: 100,
  }).catch(() => []);

  const counts = new Map<string, number>();
  const bump = (k: string) => {
    const t = k.trim();
    if (t.length < 2 || t.length > 15) return;
    counts.set(t, (counts.get(t) ?? 0) + 1);
  };

  for (const p of products) {
    if (p.category) bump(p.category);
    if (p.naver_keywords) {
      for (const kw of p.naver_keywords.split(/[,\s]+/)) bump(kw);
    }
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([k]) => k);
}

/** StoreSettings.sourcingSeedKeywords — 운영자가 직접 추가한 씨앗(신규 취급군
 *  등, 아직 상품이 없어 Product에서 파생되지 않는 것도 포함 가능). */
async function seedsFromStoreSettings(): Promise<string[]> {
  const settings = await (prisma as any).storeSettings.findUnique({
    where: { id: 'default' },
    select: { sourcingSeedKeywords: true },
  }).catch(() => null);

  const raw = settings?.sourcingSeedKeywords;
  if (!Array.isArray(raw)) return [];
  return raw.filter((k): k is string => typeof k === 'string' && k.trim().length >= 2);
}

/**
 * 소싱 씨앗 키워드를 최대 MAX_SEEDS개 반환한다.
 * 우선순위: 운영자 수동 등록(store_settings) > 상품 기반(product, 빈도순).
 * 씨앗이 하나도 없으면(신규 스토어) 빈 배열 — 호출부가 기존 DataLab
 * 카테고리 방식으로 폴백한다(조용히 빈 결과를 내지 않음).
 */
export async function resolveSourcingSeeds(): Promise<SourcingSeed[]> {
  const manual = await seedsFromStoreSettings();
  const fromProducts = await seedsFromProducts();

  const seen = new Set<string>();
  const out: SourcingSeed[] = [];

  for (const k of manual) {
    if (seen.has(k)) continue;
    seen.add(k);
    out.push({ keyword: k, source: 'store_settings' });
    if (out.length >= MAX_SEEDS) return out;
  }
  for (const k of fromProducts) {
    if (seen.has(k)) continue;
    seen.add(k);
    out.push({ keyword: k, source: 'product' });
    if (out.length >= MAX_SEEDS) return out;
  }
  return out;
}
