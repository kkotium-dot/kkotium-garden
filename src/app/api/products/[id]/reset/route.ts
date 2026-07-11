// src/app/api/products/[id]/reset/route.ts
//
// 2026-07-11 — Hub "리셋" (#245 Phase 2b, authority PRODUCT_HUB_STOCK_RESET_
// DECISION_2026-07-11). Undo app-tuning: restore an IMPORTED/HYBRID product's
// tuned fields (name / salePrice / mainImage / status) to the store's CURRENT
// Naver original. There is no stored original snapshot, so the "원본" IS the live
// Naver listing — re-fetched here. Irreversible for the local tuning, so:
//   - IMPORTED/HYBRID only (naverProductId present). APP_CREATED has no origin.
//   - confirm:true required (double gate, #46).
//   - SNAPSHOT-EXISTS CHECK: the Naver re-fetch MUST return a valid originProduct
//     before anything is overwritten — never blank-reset from a failed fetch.

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getProduct } from '@/lib/naver/api-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Manually verified FACTUAL fields reset must NEVER overwrite from the Naver
// original (#248/#62). naver_origin/originCode are corrections (원산지 정정), not
// app-tuning — restoring the supplier original would re-introduce a known error
// (명화: original says 중국, operator corrected to 국산). Extend this list when a
// new operator-verified field is added.
const PRESERVED_ON_RESET = ['naver_origin', 'originCode'] as const;

// Mirrors the import route's mapping (those helpers are route-local, not exported).
function mapStatus(statusType: string | null | undefined): string {
  switch (statusType) {
    case 'SALE':       return 'ACTIVE';
    case 'OUTOFSTOCK': return 'OUT_OF_STOCK';
    case 'SUSPENSION': return 'INACTIVE';
    default:           return 'ACTIVE';
  }
}
function pickImageUrl(op: { images?: { representativeImage?: { url?: string }; representativeImageUrl?: string }; representativeImage?: { url?: string } }): string | null {
  return (
    op?.images?.representativeImage?.url ??
    op?.images?.representativeImageUrl ??
    op?.representativeImage?.url ??
    null
  );
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const productId = params.id;
  try {
    const body = await req.json().catch(() => ({}));
    if (body?.confirm !== true) {
      return NextResponse.json({ success: false, error: 'confirm:true required (리셋은 비가역)' }, { status: 400 });
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, naverProductId: true, origin_kind: true, name: true, salePrice: true, mainImage: true, naver_status_type: true },
    });
    if (!product) {
      return NextResponse.json({ success: false, error: 'product not found' }, { status: 404 });
    }
    // IMPORTED/HYBRID only — an APP_CREATED product has no 연동 원본 to restore.
    if (!product.naverProductId) {
      return NextResponse.json(
        { success: false, error: '앱생성(APP_CREATED) 상품은 연동 원본이 없어 리셋할 수 없습니다.' },
        { status: 400 },
      );
    }

    // SNAPSHOT-EXISTS CHECK — re-fetch the live Naver original; abort if absent.
    let op: Record<string, unknown> | null = null;
    try {
      const detail = await getProduct(product.naverProductId);
      op = (detail?.originProduct ?? null) as Record<string, unknown> | null;
    } catch (e) {
      return NextResponse.json(
        { success: false, error: `네이버 원본 조회 실패 — 리셋을 중단했습니다: ${e instanceof Error ? e.message : String(e)}` },
        { status: 502 },
      );
    }
    if (!op || typeof op.name !== 'string' || !op.name) {
      return NextResponse.json(
        { success: false, error: '네이버 원본을 확인할 수 없어 리셋을 중단했습니다 (원본 스냅샷 없음).' },
        { status: 502 },
      );
    }

    const restored: Record<string, unknown> = {
      name: op.name as string,
      salePrice: Number.isFinite(op.salePrice) ? Number(op.salePrice) : product.salePrice,
      mainImage: pickImageUrl(op as never) ?? product.mainImage,
      naver_status_type: typeof op.statusType === 'string' ? (op.statusType as string) : product.naver_status_type,
      status: mapStatus(op.statusType as string | undefined),
    };
    // #248/#62 — reset restores TUNING fields only (name/salePrice/mainImage/
    // status). Manually verified FACTUAL fields are PRESERVED, never rolled back
    // to the supplier/Naver original: the Naver original re-introduces known
    // errors (e.g. naver_origin was corrected 중국→국산 but the store listing
    // still says 중국; #242 treats naver_origin as authoritative). Defensive
    // strip so a future edit can never leak a preserved field into the payload.
    for (const k of PRESERVED_ON_RESET) delete restored[k];

    await prisma.product.update({ where: { id: productId }, data: restored });

    return NextResponse.json({ success: true, restored, preserved: [...PRESERVED_ON_RESET] });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
