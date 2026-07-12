// src/app/api/products/[id]/naver-detail/route.ts
// ============================================================================
// PRODUCT-LINK P2 — inline info screen (꽃밭 돌보기 §5 인라인 정보 화면).
//
// Read-only. Surfaces the Naver-side "important info" beyond the 5-field
// diff snapshot (naver-sync route) — category path, origin, sale tags, option
// count, detail presence — so a linked product's row click gives an operator
// enough context without opening the store. Naver write 0.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getProduct } from '@/lib/naver/api-client';
import { NAVER_CATEGORIES_FULL } from '@/lib/naver/naver-categories-full';
import { loadTuningScores } from '@/lib/products/tuning-signals';

export const dynamic = 'force-dynamic';

const categoryPath = (code: string | null | undefined): string | null => {
  if (!code) return null;
  const hit = NAVER_CATEGORIES_FULL.find((c) => c.code === code);
  return hit ? hit.fullPath : null;
};

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const product = await prisma.product.findUnique({
    where: { id: params.id },
    select: {
      id: true, name: true, salePrice: true, supplierPrice: true,
      naverProductId: true, mainImage: true, naver_status_type: true,
      status: true, naverCategoryCode: true, category: true,
      shippingFee: true, updatedAt: true, keywords: true, tags: true,
      lastSaleDate: true, supplier_product_code: true,
      shipping_templates: { select: { name: true, shippingType: true } },
    },
  });
  if (!product) {
    return NextResponse.json({ success: false, error: '상품을 찾을 수 없습니다.' }, { status: 404 });
  }

  const app = {
    name: product.name,
    salePrice: product.salePrice,
    supplierPrice: product.supplierPrice,
    categoryPath: categoryPath(product.naverCategoryCode) ?? product.category ?? null,
    shippingTemplateName: product.shipping_templates?.name ?? null,
    shippingFee: product.shippingFee,
    shippingType: product.shipping_templates?.shippingType ?? null,
  };

  // 튜닝 필요도 지수 (#256 P4) — 정보 화면에 왜 손봐야 하는지 한 줄 표시.
  const tuningMap = await loadTuningScores([product]);
  const tuning = tuningMap.get(product.id) ?? null;

  if (!product.naverProductId) {
    return NextResponse.json({ success: true, linked: false, app, naver: null, tuning });
  }

  try {
    const raw = await getProduct(product.naverProductId);
    const op = (raw?.originProduct ?? raw ?? {}) as Record<string, any>;
    const detailAttribute = (op.detailAttribute ?? {}) as Record<string, any>;
    const originAreaInfo = (detailAttribute.originAreaInfo ?? {}) as Record<string, any>;
    const seoInfo = (detailAttribute.seoInfo ?? {}) as Record<string, any>;
    const optionInfo = (detailAttribute.optionInfo ?? {}) as Record<string, any>;

    const naver = {
      name: typeof op.name === 'string' ? op.name : null,
      salePrice: typeof op.salePrice === 'number' ? op.salePrice : null,
      stockQuantity: typeof op.stockQuantity === 'number' ? op.stockQuantity : null,
      statusType: typeof op.statusType === 'string' ? op.statusType : null,
      representativeImageUrl:
        op.images?.representativeImage?.url ?? op.images?.representativeImageUrl ?? null,
      optionalImageCount: Array.isArray(op.images?.optionalImages) ? op.images.optionalImages.length : 0,
      leafCategoryId: typeof op.leafCategoryId === 'string' ? op.leafCategoryId : null,
      categoryPath: categoryPath(op.leafCategoryId),
      originAreaCode: originAreaInfo.originAreaCode ?? null,
      importer: originAreaInfo.importer ?? null,
      sellerTags: Array.isArray(seoInfo.sellerTags) ? seoInfo.sellerTags.map((t: any) => t?.text).filter(Boolean) : [],
      optionCount: Array.isArray(optionInfo.optionCombinations) ? optionInfo.optionCombinations.length : 0,
      hasDetailContent: typeof op.detailContent === 'string' && op.detailContent.trim().length > 0,
      saleStartDate: typeof op.saleStartDate === 'string' ? op.saleStartDate : null,
    };

    return NextResponse.json({ success: true, linked: true, app, naver, tuning });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '알 수 없는 오류';
    return NextResponse.json({ success: false, error: msg }, { status: 502 });
  }
}
