// src/app/api/products/[id]/naver-push/route.ts
// ============================================================================
// PRODUCT-LINK PL-3 — push a price or stock change (app -> Naver).
//
// body: { field: 'price' | 'stock', value: number, dryRun?: boolean, confirm?: boolean }
//   - dryRun defaults TRUE. A real PUT happens ONLY when dryRun===false AND
//     confirm===true (GO gate, #46). Everything else returns the dry-run diff.
//   - Full-replace GET-merge (#196) — only the target field changes; all others
//     are preserved. #197 (updated): the app never AUTO-pushes stock; this route
//     is the MANUAL, explicit stock-push path and overwrites live Naver stock.
//   - price pushes also return a server-computed margin warning (역마진/저마진)
//     from the product's supplierPrice.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { updateProductPrice, updateProductStock } from '@/lib/naver/api-client';
import { writeLinkFields } from '@/lib/product-link';

export const dynamic = 'force-dynamic';

// Low-margin floor (guidance only, surfaced as a warning — never blocks the push).
const LOW_MARGIN_FLOOR_PCT = 10;

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const product = await prisma.product.findUnique({
    where: { id: params.id },
    select: { id: true, name: true, naverProductId: true, salePrice: true, supplierPrice: true },
  });
  if (!product) {
    return NextResponse.json({ success: false, error: '상품을 찾을 수 없습니다.' }, { status: 404 });
  }
  if (!product.naverProductId) {
    return NextResponse.json({ success: false, error: '네이버에 연동되지 않은 상품입니다.' }, { status: 400 });
  }

  const body = await request.json().catch(() => ({} as Record<string, unknown>));
  const field = body?.field === 'price' ? 'price' : body?.field === 'stock' ? 'stock' : null;
  if (!field) {
    return NextResponse.json({ success: false, error: "field는 'price' 또는 'stock'." }, { status: 400 });
  }
  const value = typeof body?.value === 'number' ? body.value : Number(body?.value);
  if (!Number.isFinite(value)) {
    return NextResponse.json({ success: false, error: 'value(숫자)가 필요합니다.' }, { status: 400 });
  }

  // GO gate (#46): a real write requires BOTH dryRun:false AND confirm:true.
  const dryRun = body?.dryRun !== false;
  const confirm = body?.confirm === true;
  const willWrite = !dryRun && confirm;

  try {
    if (willWrite) {
      await writeLinkFields(product.id, { syncState: 'PENDING' });
      console.warn(`[naver-push] REAL PUT — product=${product.id} naver=${product.naverProductId} field=${field} value=${value}`);
    }

    const result =
      field === 'price'
        ? await updateProductPrice(product.naverProductId, value, { dryRun: !willWrite })
        : await updateProductStock(product.naverProductId, value, { dryRun: !willWrite });

    // Margin guidance for a price push (warning only — never blocks).
    let margin: { supplierPrice: number | null; marginPct: number | null; reverseMargin: boolean; lowMargin: boolean } | undefined;
    if (field === 'price') {
      const sp = typeof product.supplierPrice === 'number' ? product.supplierPrice : null;
      const marginPct = sp != null && value > 0 ? Math.round(((value - sp) / value) * 100) : null;
      margin = {
        supplierPrice: sp,
        marginPct,
        reverseMargin: sp != null && value <= sp,
        lowMargin: marginPct != null && marginPct >= 0 && marginPct < LOW_MARGIN_FLOOR_PCT,
      };
    }

    if (willWrite) {
      await writeLinkFields(product.id, {
        syncState: result.applied ? 'SYNCED' : 'FAILED',
        lastSyncedAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      field,
      dryRun: !willWrite,
      goGated: !willWrite && !dryRun, // requested a write without confirm
      margin,
      ...result,
    });
  } catch (e) {
    if (willWrite) {
      await writeLinkFields(product.id, { syncState: 'FAILED' }).catch(() => {});
    }
    const msg = e instanceof Error ? e.message : '알 수 없는 오류';
    console.error('[naver-push] failed:', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 502 });
  }
}
