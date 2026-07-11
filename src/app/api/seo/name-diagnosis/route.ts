// POST /api/seo/name-diagnosis
// ============================================================================
// Batch 상품명 진단 (NAME-DIAG-3, #251). Authority:
// docs/design/SEO_NAME_DIAGNOSIS_ENGINE_SPEC_2026-07-12.md
//
// The revival hub / reactivation list send a set of productIds; we load each
// product server-side, derive its category triple (code -> triple, else parse
// the category path), resolve the D1 trend from the cache ONCE per distinct D1,
// run the PURE computeNameDiagnosis, and return a compact per-id badge. Keeping
// the compute server-side means the badge shows the real SEO×ROI trend axis
// (#249) instead of an always-'unknown' client fallback.
//
// Pure read: no external API, no Naver write (#37/#38). Degrades gracefully — a
// cold trend cache just yields trendReflected:'unknown' for that row.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { NAVER_CATEGORIES_FULL } from '@/lib/naver/naver-categories-full';
import { computeNameDiagnosis } from '@/lib/seo/product-name-diagnosis';
import { getCachedTrend, buildD1Key, type CategoryTrendEntry } from '@/lib/naver/category-trend-cache';

export const dynamic = 'force-dynamic';

// Compact badge payload per product (the list only needs these).
interface NameBadge {
  id: string;
  grade: 'S' | 'A' | 'B' | 'C';
  nameScore: number;
  trendReflected: 'strong' | 'ok' | 'weak' | 'unknown';
  topWeakness: string | null; // highest-impact weakness label
  weaknessCount: number;
  suggestions: string[]; // top 1..3, seller language (#233)
  caveats: string[]; // honest limits (#231)
}

function tripleFromProduct(
  category: string | null | undefined,
  naverCategoryCode: string | null | undefined,
): { d1: string; d2: string; d3: string } | null {
  // 1) Numeric Naver code -> canonical triple (most reliable).
  const code = naverCategoryCode?.trim();
  if (code && code !== '50003307') {
    const hit = NAVER_CATEGORIES_FULL.find((c) => c.code === code);
    if (hit) return { d1: hit.d1, d2: hit.d2 ?? '', d3: hit.d3 ?? '' };
  }
  // 2) Fall back to parsing the human-readable path string.
  const parts = (category ?? '')
    .split(/\s*[>/]\s*/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length > 0 && !/^\d+$/.test(parts[0])) {
    return { d1: parts[0], d2: parts[1] ?? '', d3: parts[2] ?? '' };
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const ids: string[] = Array.isArray(body?.productIds)
      ? body.productIds.filter((x: unknown): x is string => typeof x === 'string').slice(0, 500)
      : [];
    if (ids.length === 0) {
      return NextResponse.json({ success: true, diagnoses: {} });
    }

    const products = await prisma.product.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        name: true,
        category: true,
        naverCategoryCode: true,
        supplierPrice: true,
        shippingFee: true,
        keywords: true,
      },
    });

    // Resolve each distinct D1 trend once.
    const trendByD1 = new Map<string, CategoryTrendEntry | null>();
    const diagnoses: Record<string, NameBadge> = {};

    for (const p of products) {
      const triple = tripleFromProduct(p.category, p.naverCategoryCode);
      let trend: CategoryTrendEntry | null = null;
      if (triple) {
        const key = buildD1Key(triple.d1);
        if (!trendByD1.has(key)) {
          trendByD1.set(key, await getCachedTrend(key).catch(() => null));
        }
        trend = trendByD1.get(key) ?? null;
      }

      const keywords = Array.isArray(p.keywords) ? (p.keywords as unknown[]).filter((k): k is string => typeof k === 'string') : [];

      // categoryPath drives the base checkCategoryFit; synthesize one from the
      // resolved triple when the row only has a numeric code, so a product with
      // a known category isn't falsely flagged "카테고리 미선택".
      const categoryPath =
        p.category?.trim() ||
        (triple ? [triple.d1, triple.d2, triple.d3].filter(Boolean).join('>') : undefined);

      const diag = computeNameDiagnosis({
        name: p.name ?? '',
        d1: triple?.d1,
        d2: triple?.d2,
        d3: triple?.d3,
        categoryPath,
        keywords,
        supplierPrice: p.supplierPrice,
        shippingFee: p.shippingFee,
        trend,
      });

      diagnoses[p.id] = {
        id: p.id,
        grade: diag.grade,
        nameScore: diag.nameScore,
        trendReflected: diag.trendReflected,
        topWeakness: diag.weaknesses[0]?.label ?? null,
        weaknessCount: diag.weaknesses.length,
        suggestions: diag.suggestions,
        caveats: diag.caveats,
      };
    }

    return NextResponse.json({ success: true, diagnoses });
  } catch (e) {
    const msg = e instanceof Error ? e.message.slice(0, 200) : 'name_diagnosis_error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
