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
