// src/app/api/upload-readiness/auto-fill/route.ts
// E-15 Block B: Auto-fill API endpoint
// POST  → preview suggestions (DB unchanged)
// PATCH → apply seller-approved suggestions only
//
// Safety: AI-generated values NEVER go directly to DB.
// PATCH validates each accepted value against the same rules as Block A
// before writing to Prisma. Only AUTOFILLABLE_ITEMS are honored.

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calcUploadReadiness, type ReadinessItemId } from '@/lib/upload-readiness';
import {
  autoFillAll,
  partitionReadinessItems,
  AUTOFILLABLE_ITEMS,
  type AutoFillableItemId,
} from '@/lib/upload-readiness-filler';

export const dynamic = 'force-dynamic';

// ── POST: preview suggestions (DB unchanged) ─────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productId, items } = body as {
      productId: string;
      items?: ReadinessItemId[];
    };

    if (!productId) {
      return NextResponse.json(
        { success: false, error: 'productId가 필요합니다.' },
        { status: 400 },
      );
    }

    // Fetch product context
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        name: true,
        description: true,
        naverCategoryCode: true,
        category: true,
        keywords: true,
        tags: true,
        mainImage: true,
        images: true,
        shipping_template_id: true,
        salePrice: true,
        supplierPrice: true,
      },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: '상품을 찾을 수 없습니다.' },
        { status: 404 },
      );
    }

    // Decide which items to fill
    let itemIds: ReadinessItemId[];
    if (Array.isArray(items) && items.length > 0) {
      itemIds = items;
    } else {
      // Auto-detect: calculate current readiness, target failed items
      const readiness = calcUploadReadiness({
        naverCategoryCode: product.naverCategoryCode,
        keywords: Array.isArray(product.keywords) ? (product.keywords as string[]) : [],
        tags: Array.isArray(product.tags) ? (product.tags as string[]) : [],
        name: product.name,
        mainImage: product.mainImage,
        images: product.images,
        shippingTemplateId: product.shipping_template_id,
        salePrice: product.salePrice,
        supplierPrice: product.supplierPrice,
      });
      itemIds = readiness.failed.map((f) => f.id);
    }

    // Partition into autofillable / non-autofillable
    const { autofillable, nonAutofillable } = partitionReadinessItems(itemIds);

    if (autofillable.length === 0) {
      return NextResponse.json({
        success: true,
        suggestions: [],
        unfillable: nonAutofillable,
        autofillableRequested: [],
        autofillableSucceeded: [],
        message: '자동 채우기 가능한 항목이 없습니다. 셀러 수동 작업이 필요한 항목만 남아 있습니다.',
      });
    }

    // Run autoFillAll
    const fillInput = {
      productId: product.id,
      productName: product.name,
      productDescription: product.description ?? null,
      naverCategoryCode: product.naverCategoryCode,
      naverCategoryName: product.category ?? null,
      currentKeywords: Array.isArray(product.keywords) ? (product.keywords as string[]) : [],
      currentTags: Array.isArray(product.tags) ? (product.tags as string[]) : [],
      salePrice: product.salePrice,
      supplierPrice: product.supplierPrice,
    };

    const suggestions = await autoFillAll(fillInput, autofillable);

    return NextResponse.json({
      success: true,
      suggestions,
      unfillable: nonAutofillable,
      autofillableRequested: autofillable,
      autofillableSucceeded: suggestions.map((s) => s.itemId),
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : '알 수 없는 오류';
    console.error('[api/upload-readiness/auto-fill POST]', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// ── PATCH: apply seller-approved suggestions ─────────────────────────────────
interface AcceptedSuggestion {
  itemId: AutoFillableItemId;
  value: string | string[];
}

// Validation helpers — re-applied at PATCH time to defend against tampered payloads
const ABUSE_WORDS_LOCAL = [
  '무료배송', '최저가', '특가', '할인', '세일', '긴급', '한정',
  '품절임박', '마감임박', '무조건', '보장', '100%', '완전무료',
  '대박', '초특가', '역대급', '레전드',
];

function containsAbuse(s: string): boolean {
  const lower = s.toLowerCase();
  return ABUSE_WORDS_LOCAL.some((w) => lower.includes(w.toLowerCase()));
}

function hasRepeat3Plus(s: string): boolean {
  const wordFreq: Record<string, number> = {};
  s.replace(/[^\w\s가-힣]/g, ' ')
    .split(/\s+/)
    .forEach((w) => {
      if (w.length > 1) wordFreq[w] = (wordFreq[w] ?? 0) + 1;
    });
  return Object.values(wordFreq).some((c) => c >= 3);
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { productId, accepted } = body as {
      productId: string;
      accepted: AcceptedSuggestion[];
    };

    if (!productId) {
      return NextResponse.json(
        { success: false, error: 'productId가 필요합니다.' },
        { status: 400 },
      );
    }
    if (!Array.isArray(accepted) || accepted.length === 0) {
      return NextResponse.json(
        { success: false, error: '적용할 항목이 없습니다.' },
        { status: 400 },
      );
    }

    // Build update payload — strict whitelist by itemId, validation re-applied
    const update: Record<string, unknown> = {};
    const applied: AutoFillableItemId[] = [];
    const rejected: { itemId: string; reason: string }[] = [];

    for (const a of accepted) {
      if (!(AUTOFILLABLE_ITEMS as readonly string[]).includes(a.itemId)) {
        rejected.push({ itemId: String(a.itemId), reason: 'not autofillable' });
        continue;
      }

      switch (a.itemId) {
        case 'name_length':
        case 'no_abuse':
        case 'no_repeat':
        case 'keyword_in_front': {
          // String value, length 25~50, no abuse, no 3+ repeats
          if (typeof a.value !== 'string') {
            rejected.push({ itemId: a.itemId, reason: 'value not string' });
            break;
          }
          const v = a.value.trim();
          if (v.length < 25 || v.length > 50) {
            rejected.push({ itemId: a.itemId, reason: `length ${v.length} out of 25-50` });
            break;
          }
          if (containsAbuse(v)) {
            rejected.push({ itemId: a.itemId, reason: 'contains abuse word' });
            break;
          }
          if (hasRepeat3Plus(v)) {
            rejected.push({ itemId: a.itemId, reason: 'has 3+ repeated word' });
            break;
          }
          // For keyword_in_front mode, name update is the same
          update.name = v;
          if (!applied.includes(a.itemId)) applied.push(a.itemId);
          break;
        }
        case 'keywords_count': {
          if (!Array.isArray(a.value)) {
            rejected.push({ itemId: a.itemId, reason: 'value not array' });
            break;
          }
          const filtered = a.value
            .map((k) => String(k ?? '').trim().replace(/^#/, ''))
            .filter((k) => k.length >= 2 && k.length <= 10 && !containsAbuse(k));
          if (filtered.length < 5) {
            rejected.push({ itemId: a.itemId, reason: `only ${filtered.length} valid keywords` });
            break;
          }
          // Dedup and cap at 10
          const seen = new Set<string>();
          const unique: string[] = [];
          for (const k of filtered) {
            if (!seen.has(k)) {
              seen.add(k);
              unique.push(k);
              if (unique.length >= 10) break;
            }
          }
          update.keywords = unique;
          applied.push(a.itemId);
          break;
        }
        case 'tags_count': {
          if (!Array.isArray(a.value)) {
            rejected.push({ itemId: a.itemId, reason: 'value not array' });
            break;
          }
          const filtered = a.value
            .map((t) => String(t ?? '').trim().replace(/^#/, ''))
            .filter((t) => t.length >= 2 && t.length <= 6 && !containsAbuse(t));
          if (filtered.length < 10) {
            rejected.push({ itemId: a.itemId, reason: `only ${filtered.length} valid tags` });
            break;
          }
          const seen = new Set<string>();
          const unique: string[] = [];
          for (const t of filtered) {
            if (!seen.has(t)) {
              seen.add(t);
              unique.push(t);
              if (unique.length >= 12) break;
            }
          }
          update.tags = unique;
          applied.push(a.itemId);
          break;
        }
        case 'category': {
          if (typeof a.value !== 'string') {
            rejected.push({ itemId: a.itemId, reason: 'value not string' });
            break;
          }
          const code = a.value.trim();
          if (!code || code === '50003307') {
            rejected.push({ itemId: a.itemId, reason: 'empty or default category' });
            break;
          }
          // Final defense: ensure code exists in NAVER_CATEGORIES_FULL
          // (Block A already constrained this, but PATCH may receive untrusted input)
          const { NAVER_CATEGORIES_FULL } = await import('@/lib/naver/naver-categories-full');
          if (!NAVER_CATEGORIES_FULL.some((c) => c.code === code)) {
            rejected.push({ itemId: a.itemId, reason: 'code not in NAVER_CATEGORIES_FULL' });
            break;
          }
          update.naverCategoryCode = code;
          applied.push(a.itemId);
          break;
        }
      }
    }

    if (applied.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: '검증을 통과한 적용 항목이 없습니다.',
          rejected,
        },
        { status: 400 },
      );
    }

    update.updatedAt = new Date();

    // Apply update
    const updated = await prisma.product.update({
      where: { id: productId },
      data: update as never,
      select: {
        id: true,
        name: true,
        naverCategoryCode: true,
        keywords: true,
        tags: true,
        mainImage: true,
        images: true,
        salePrice: true,
        supplierPrice: true,
        shipping_template_id: true,
      },
    });

    // Recalculate readiness with updated product
    const newReadiness = calcUploadReadiness({
      naverCategoryCode: updated.naverCategoryCode,
      keywords: Array.isArray(updated.keywords) ? (updated.keywords as string[]) : [],
      tags: Array.isArray(updated.tags) ? (updated.tags as string[]) : [],
      name: updated.name,
      mainImage: updated.mainImage,
      images: updated.images,
      shippingTemplateId: updated.shipping_template_id,
      salePrice: updated.salePrice,
      supplierPrice: updated.supplierPrice,
    });

    return NextResponse.json({
      success: true,
      applied,
      rejected,
      newScore: newReadiness.score,
      newGrade: newReadiness.grade,
      newLabel: newReadiness.label,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : '알 수 없는 오류';
    console.error('[api/upload-readiness/auto-fill PATCH]', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
