// GET /api/naver/products/sync
// B-3: Fetch real-time status of Naver-registered products and detect mismatches
// Returns: { products: [{ id, naverProductId, naverStatus, localStatus, mismatch }] }

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { naverRequest } from '@/lib/naver/api-client';

export const dynamic = 'force-dynamic';

// Naver statusType -> human label
const NAVER_STATUS_LABEL: Record<string, string> = {
  SALE:       '판매중',
  SUSPENSION: '판매중지',
  CLOSE:      '판매종료',
  PROHIBITION: '판매금지',
  DELETION:   '삭제',
  OUTOFSTOCK: '품절',
};

export async function GET() {
  try {
    // Load all products that have a naverProductId
    const products = await (prisma as any).product.findMany({
      where: { naverProductId: { not: null } },
      select: { id: true, name: true, naverProductId: true, status: true },
    });

    if (products.length === 0) {
      return NextResponse.json({ success: true, products: [], message: '네이버 등록 상품이 없습니다.' });
    }

    const results = [];

    for (const p of products) {
      try {
        // Naver Commerce API: GET channel product by naverProductId
        const raw = await naverRequest(
          'GET',
          `/v1/products/channel-products/${p.naverProductId}`
        ) as Record<string, unknown>;

        const channelProduct = (raw?.channelProduct ?? raw) as Record<string, unknown>;
        const originProduct  = (raw?.originProduct  ?? {}) as Record<string, unknown>;

        const naverStatusType    = String(channelProduct?.channelProductDisplayStatusType ?? originProduct?.statusType ?? 'UNKNOWN');
        const naverStatusLabel   = NAVER_STATUS_LABEL[naverStatusType] ?? naverStatusType;

        // Detect mismatch: local says ACTIVE but naver says not SALE/ON
        const naverIsActive = ['SALE', 'ON_SALE'].includes(naverStatusType) ||
          String(channelProduct?.channelProductDisplayStatusType ?? '').toUpperCase() === 'ON';
        const localIsActive = p.status === 'ACTIVE';
        const mismatch      = localIsActive !== naverIsActive;

        results.push({
          id:               p.id,
          name:             p.name,
          naverProductId:   p.naverProductId,
          naverStatusType,
          naverStatusLabel,
          naverIsActive,
          localStatus:      p.status,
          mismatch,
          mismatchDetail:   mismatch
            ? (localIsActive ? `앱: 판매중 / 네이버: ${naverStatusLabel}` : `앱: 비활성 / 네이버: ${naverStatusLabel}`)
            : null,
        });

        // Auto-fix: if naver says SUSPENSION/OUTOFSTOCK but local is ACTIVE → update local
        if (mismatch && !naverIsActive && localIsActive) {
          await (prisma as any).product.update({
            where: { id: p.id },
            data:  { status: naverStatusType === 'OUTOFSTOCK' ? 'OUT_OF_STOCK' : 'INACTIVE' },
          }).catch(() => null);
        }

      } catch (err) {
        // API error for individual product — don't fail the whole batch
        results.push({
          id:             p.id,
          name:           p.name,
          naverProductId: p.naverProductId,
          naverStatusType: 'API_ERROR',
          naverStatusLabel: 'API 오류',
          naverIsActive:  null,
          localStatus:    p.status,
          mismatch:       false,
          mismatchDetail: null,
          error:          err instanceof Error ? err.message.slice(0, 80) : String(err),
        });
      }
    }

    const mismatchCount = results.filter(r => r.mismatch).length;

    return NextResponse.json({
      success: true,
      total:   results.length,
      mismatchCount,
      products: results,
    });

  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[naver/products/sync]', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
