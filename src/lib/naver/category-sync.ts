// src/lib/naver/category-sync.ts
// ============================================================================
// Category re-sync helper (#62). When a product's naverCategoryCode is corrected
// (re-classified), its human-readable `category` text field must follow — or the
// two drift (e.g. naverCategoryCode says car-diffuser but the category text still
// reads the old indoor-diffuser leaf). The leaf name is derived from the LOCAL
// category dataset only (no Naver API, #3-3). All-product universal (#55) — no
// per-product branch; the mapping is data.
//
// `category` text feeds deriveProductSignals + display; it does NOT feed the
// Naver payload (that uses naverCategoryCode → leafCategoryId), so this sync is
// fully reversible and Naver-touch-free.
// ============================================================================

import { prisma } from '@/lib/prisma';
import { NAVER_CATEGORIES_FULL } from './naver-categories-full';

// code -> entry, built once from the local dataset (O(1) lookup).
const BY_CODE = new Map(NAVER_CATEGORIES_FULL.map((c) => [c.code, c]));

/**
 * The deepest non-empty depth label for a category code (the leaf the product
 * UI shows, e.g. the d4 name). Returns null for an unknown code.
 */
export function leafCategoryName(code: string | null | undefined): string | null {
  const entry = BY_CODE.get((code ?? '').trim());
  if (!entry) return null;
  return entry.d4 || entry.d3 || entry.d2 || entry.d1 || null;
}

/** Full path label for a code (the d1 > d2 > d3 > d4 join) or null. */
export function categoryFullPath(code: string | null | undefined): string | null {
  const entry = BY_CODE.get((code ?? '').trim());
  return entry?.fullPath ?? null;
}

// ============================================================================
// 2026-09-02 (반자동 개입큐 저장단계 연결): naverCategoryCode -> naver_categories.id
// 조회. 이 함수 자체는 UCE-8(별도 브랜치, 병합 보류 — docs 상신 참고)에도 있던
// 순수 코드↔DB 조회지만, 여기서는 의도적으로 POST(생성 기본값)나 백필 스크립트가
// 아니라 사람이 직접 편집을 트리거하는 PUT/PATCH 저장 경로에만 배선한다(아래
// route.ts 참고) — naverCategoryCode가 이 경로로 바뀔 때는 항상 사람이 방금
// 확정한 값이지, 구백필처럼 과거의 미검증 코드를 일괄 재해석하는 게 아니다.
// naver_categories 미적재/코드 미상이면 null(호출자는 category_id 그대로 둠).
// ============================================================================
export async function resolveCategoryDbId(code: string | null | undefined): Promise<string | null> {
  const trimmed = (code ?? '').trim();
  if (!trimmed) return null;
  try {
    const row = await prisma.naverCategory.findUnique({
      where: { categoryCode: trimmed },
      select: { id: true },
    });
    return row?.id ?? null;
  } catch (e) {
    console.warn('[category-sync] resolveCategoryDbId failed:', String(e).slice(0, 120));
    return null;
  }
}

/** True when `id` is a real naver_categories row — defensive validation before
 *  ever writing a caller-supplied category_id straight to Product (2026-09-02,
 *  Desktop 지시: "무효 id 방어"). */
export async function isValidCategoryDbId(id: string | null | undefined): Promise<boolean> {
  const trimmed = (id ?? '').trim();
  if (!trimmed) return false;
  try {
    const row = await prisma.naverCategory.findUnique({ where: { id: trimmed }, select: { id: true } });
    return !!row;
  } catch (e) {
    console.warn('[category-sync] isValidCategoryDbId failed:', String(e).slice(0, 120));
    return false;
  }
}

export interface CategorySyncResult {
  updated: boolean;
  /** Reason when not updated: code unknown / already in sync / product missing. */
  reason?: 'unknown_code' | 'already_synced' | 'product_not_found' | 'no_code';
  from?: string | null;
  to?: string | null;
}

/**
 * Re-sync ONE product's `category` text to match the leaf of its current
 * naverCategoryCode. Idempotent — a no-op when already in sync. DB-only,
 * Naver-untouched. Use after any re-classification (naverCategoryCode change).
 */
export async function syncProductCategory(productId: string): Promise<CategorySyncResult> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, category: true, naverCategoryCode: true },
  });
  if (!product) return { updated: false, reason: 'product_not_found' };
  const code = product.naverCategoryCode?.trim();
  if (!code) return { updated: false, reason: 'no_code', from: product.category };
  const leaf = leafCategoryName(code);
  if (!leaf) return { updated: false, reason: 'unknown_code', from: product.category };
  if (product.category === leaf) {
    return { updated: false, reason: 'already_synced', from: product.category, to: leaf };
  }
  await prisma.product.update({ where: { id: productId }, data: { category: leaf } });
  return { updated: true, from: product.category, to: leaf };
}
