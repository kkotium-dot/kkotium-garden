// src/app/api/products/[id]/naver-status/route.ts
// ============================================================================
// PRODUCT-LINK PL-2 — push a status change (품절/재판매) to Naver.
//
// body: { target: 'OUTOFSTOCK' | 'SALE' | 'SUSPENSION', dryRun?: boolean, confirm?: boolean }
//   - dryRun defaults TRUE. A real PUT happens ONLY when dryRun===false AND
//     confirm===true (GO gate, #46). Everything else returns the dry-run diff.
//   - The push itself is a full-replace GET-merge (#196); no stock-quantity
//     push beyond exactly-zero for 품절 (#197). SUSPENSION(판매중지)은 statusType
//     만 직접 세팅하고 재고는 보존한다(#277) — 처분 권고(#273) 장기품절 경로.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { updateProductStatus } from '@/lib/naver/api-client';
import { writeLinkFields } from '@/lib/product-link';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const product = await prisma.product.findUnique({
    where: { id: params.id },
    select: { id: true, name: true, naverProductId: true },
  });
  if (!product) {
    return NextResponse.json({ success: false, error: '상품을 찾을 수 없습니다.' }, { status: 404 });
  }
  if (!product.naverProductId) {
    return NextResponse.json({ success: false, error: '네이버에 연동되지 않은 상품입니다.' }, { status: 400 });
  }

  const body = await request.json().catch(() => ({} as Record<string, unknown>));
  const target =
    body?.target === 'SALE' ? 'SALE'
    : body?.target === 'OUTOFSTOCK' ? 'OUTOFSTOCK'
    : body?.target === 'SUSPENSION' ? 'SUSPENSION'
    : null;
  if (!target) {
    return NextResponse.json({ success: false, error: "target은 'OUTOFSTOCK' | 'SALE' | 'SUSPENSION'." }, { status: 400 });
  }

  // GO gate (#46): a real write requires BOTH an explicit dryRun:false AND confirm:true.
  const dryRun = body?.dryRun !== false;
  const confirm = body?.confirm === true;
  const willWrite = !dryRun && confirm;

  try {
    if (willWrite) {
      // Mark push in-flight (guarded) before the irreversible PUT.
      await writeLinkFields(product.id, { syncState: 'PENDING' });
      console.warn(`[naver-status] REAL PUT — product=${product.id} naver=${product.naverProductId} target=${target}`);
    }

    const result = await updateProductStatus(product.naverProductId, target, { dryRun: !willWrite });

    if (willWrite) {
      await writeLinkFields(product.id, {
        syncState: result.applied ? 'SYNCED' : 'FAILED',
        lastSyncedAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      dryRun: !willWrite,
      goGated: !willWrite && !dryRun, // requested a write without confirm
      ...result,
    });
  } catch (e) {
    if (willWrite) {
      await writeLinkFields(product.id, { syncState: 'FAILED' }).catch(() => {});
    }
    const msg = e instanceof Error ? e.message : '알 수 없는 오류';
    console.error('[naver-status] failed:', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 502 });
  }
}
