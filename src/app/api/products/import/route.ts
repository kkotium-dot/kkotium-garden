// src/app/api/products/import/route.ts
// ============================================================================
// PRODUCT-LINK PL-1 — import selected Naver products into the local app.
//
// body: { items: [{ originProductNo?, channelProductNo? }] }
//   - originProductNo given (picker path) → getProduct → map → create.
//   - only channelProductNo given (manual entry) → getChannelProduct to
//     normalize to originProductNo first.
// Dedup: existing naverProductId → skip ("이미 연동됨"). Partial failure is
// reported honestly per item (#82). Link metadata is written through the
// P2022-guarded helper (no-op before Desktop's ALTER). Naver write 0.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getProduct, getChannelProduct } from '@/lib/naver/api-client';
import { writeLinkFields } from '@/lib/product-link';

export const dynamic = 'force-dynamic';

interface ImportItem {
  originProductNo?: string | number;
  channelProductNo?: string | number;
}

// Map a Naver statusType to the app's Product.status.
function mapStatus(statusType: string | null | undefined): string {
  switch (statusType) {
    case 'SALE':       return 'ACTIVE';
    case 'OUTOFSTOCK': return 'OUT_OF_STOCK';
    case 'SUSPENSION': return 'INACTIVE';
    default:           return 'ACTIVE';
  }
}

function pickImageUrl(op: any): string | null {
  return (
    op?.images?.representativeImage?.url ??
    op?.images?.representativeImageUrl ??
    op?.representativeImage?.url ??
    null
  );
}

// #5/#6 — 가져온 상품이 씨앗심기(?edit=)로 열릴 때 재입력 없이 이어 쓸 수 있도록,
// Naver 원상품 상세에 이미 있는 정보는 가져오기 시점에 최대한 함께 저장한다.
// (씨앗심기 hydrate 자체는 정상 — 문제는 import가 name/salePrice/mainImage 외
// 전부 비워서 저장했던 것.) 형식이 앱 스키마와 100% 동일한 필드만 채운다
// (원산지 코드 등 체계가 다른 필드는 오매핑 위험이 있어 제외).
function pickAdditionalImages(op: any): string[] {
  const opt = op?.images?.optionalImages;
  if (!Array.isArray(opt)) return [];
  return opt.map((i: any) => i?.url).filter((u: unknown): u is string => typeof u === 'string' && !!u);
}

function pickSellerTags(op: any): string[] {
  const tags = op?.detailAttribute?.seoInfo?.sellerTags;
  if (!Array.isArray(tags)) return [];
  return tags.map((t: any) => t?.text).filter((t: unknown): t is string => typeof t === 'string' && !!t);
}

// #4 — 마진 계산은 salePrice - instant_discount(원)를 실제 판매가로 쓴다
// (profitability/route.ts). 네이버 즉시할인(customerBenefit.immediateDiscountPolicy,
// PC 우선)을 읽어 원화 금액으로 환산해 그대로 세팅 — 안 하면 마진이 정가 기준으로 계산됨.
function pickInstantDiscountWon(op: any, salePrice: number): number | null {
  const method = op?.customerBenefit?.immediateDiscountPolicy?.discountMethod?.[0];
  if (!method || typeof method.value !== 'number') return null;
  if (method.unitType === 'PERCENT') {
    return Math.floor(salePrice * Math.min(Math.max(method.value, 0), 100) / 100);
  }
  if (method.unitType === 'WON') {
    return Math.min(Math.max(method.value, 0), salePrice);
  }
  return null;
}

export async function POST(request: NextRequest) {
  let body: { items?: ImportItem[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: '잘못된 요청 본문' }, { status: 400 });
  }
  const items = Array.isArray(body?.items) ? body.items : [];
  if (items.length === 0) {
    return NextResponse.json({ success: false, error: '연동할 상품이 없습니다.' }, { status: 400 });
  }

  const defaultSupplier = await prisma.supplier.findFirst();
  const defaultUser = await prisma.user.findFirst();
  if (!defaultSupplier || !defaultUser) {
    return NextResponse.json(
      { success: false, error: '기본 공급사/사용자가 없어 임포트할 수 없습니다.' },
      { status: 400 },
    );
  }

  const imported: Array<{ no: string; id: string; name: string }> = [];
  const skipped: Array<{ no: string; reason: string }> = [];
  const failed: Array<{ no: string; error: string }> = [];

  for (const raw of items) {
    let channelNo = raw?.channelProductNo != null ? String(raw.channelProductNo) : null;
    let originNo = raw?.originProductNo != null ? String(raw.originProductNo) : null;
    const label = originNo ?? channelNo ?? '(번호 없음)';

    try {
      // Normalize a manual channel number to its origin number.
      if (!originNo && channelNo) {
        const ch = await getChannelProduct(channelNo);
        originNo = String(
          ch?.originProductNo ??
          ch?.originProduct?.originProductNo ??
          ch?.originProduct?.no ??
          '',
        ) || null;
        if (!originNo) {
          failed.push({ no: label, error: '원상품번호(originProductNo)를 확인할 수 없습니다.' });
          continue;
        }
      }
      if (!originNo) {
        failed.push({ no: label, error: '상품번호가 비어 있습니다.' });
        continue;
      }

      // Dedup — naverProductId is the mapping key (= originProductNo).
      const existing = await prisma.product.findFirst({
        where: { naverProductId: originNo },
        select: { id: true },
      });
      if (existing) {
        skipped.push({ no: originNo, reason: '이미 연동됨' });
        continue;
      }

      // Fetch full detail and map to the app schema.
      const detail = await getProduct(originNo);
      const op = detail?.originProduct ?? {};
      const name: string = typeof op.name === 'string' && op.name ? op.name : `네이버 상품 ${originNo}`;
      const salePrice = Number.isFinite(op?.salePrice) ? Number(op.salePrice) : 0;
      const modifiedDate: string | null = op?.modifiedDate ?? detail?.modifiedDate ?? null;
      const instantDiscount = pickInstantDiscountWon(op, salePrice);
      const description: string | undefined =
        typeof op?.detailContent === 'string' && op.detailContent.trim() ? op.detailContent : undefined;
      const naverCategoryCode: string | undefined =
        typeof op?.leafCategoryId === 'string' && op.leafCategoryId ? op.leafCategoryId : undefined;
      const additionalImages = pickAdditionalImages(op);
      const sellerTags = pickSellerTags(op);

      const created = await prisma.product.create({
        data: {
          name,
          salePrice,
          supplierPrice: 0,      // unknown for an imported listing (no cost basis)
          margin: 0,             // recomputed once a supplier cost is entered
          sku: `NAVER-${originNo}`,
          supplierId: defaultSupplier.id,
          userId: defaultUser.id,
          naverProductId: originNo,
          status: mapStatus(op?.statusType),
          mainImage: pickImageUrl(op),
          naver_status_type: typeof op?.statusType === 'string' ? op.statusType : null,
          instant_discount: instantDiscount,
          description,
          naverCategoryCode,
          images: additionalImages,
          tags: sellerTags.length > 0 ? sellerTags : undefined,
        },
        select: { id: true },
      });

      // Link metadata — guarded (no-op until the ALTER lands).
      await writeLinkFields(created.id, {
        source: 'IMPORTED',
        channelProductNo: channelNo,
        linkStatus: 'LINKED',
        naverModifiedAt: modifiedDate,
        lastSyncedAt: new Date().toISOString(),
        syncState: 'SYNCED',
      });

      imported.push({ no: originNo, id: created.id, name });
    } catch (e) {
      const msg = e instanceof Error ? e.message : '알 수 없는 오류';
      failed.push({ no: label, error: msg });
    }
  }

  return NextResponse.json({ success: true, imported, skipped, failed });
}
