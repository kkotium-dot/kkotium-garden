// src/app/api/products/publish-readiness-batch/route.ts
//
// 2026-07-11 — Batch publish-readiness for the /products hub (#245, per-row
// 발행준비 X/8). Runs the SAME getPublishReadiness gate as the single-product
// checklist, but for every product in ONE pass (one findMany + one address
// lookup) so the hub can show each row's X/8 without an N+1 fan-out. Read-only.
//
// 2026-07-29 — reviewApproved 필드 추가(#300). getPublishReadiness는 구조
// 게이트(8항목)뿐 검수 승인은 안 본다 — 정원창고 배지가 "발행 가능"을 구조만
// 으로 말해 서버(assertPublishable)와 어긋나는 문제(#310 Desktop 관측)를
// 해소한다. reviewChecklist는 이미 findMany가 전체 컬럼을 가져오므로(별도
// select 없음) 추가 쿼리 비용 0 — approved 플래그만 읽는 경량 판정(Option A:
// readiness/이미지경고 재계산은 OCR 비용이라 여기선 하지 않음, 근사치임을
// 배지 문구로 정직하게 표시).

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPublishReadiness } from '@/lib/naver/publish-readiness';
import { getNaverAddressIds } from '@/lib/naver/load-update-context';
import type { LocalProduct } from '@/lib/naver/product-builder';
import type { ReviewChecklist } from '@/lib/products/publish-review-gate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // One address lookup (store-level) shared by every product's gate.
    const addresses = await getNaverAddressIds();
    const hasAddresses = !!addresses;

    const dbProducts = await prisma.product.findMany({
      include: { product_options: true },
    });

    const items = dbProducts.map((db) => {
      const product: LocalProduct = {
        ...db,
        additionalImages: db.additionalImages as unknown,
        keywords: db.keywords as unknown,
        tags: db.tags as unknown,
        product_options: db.product_options ?? null,
      };
      const r = getPublishReadiness(product, !!db.shipping_template_id, hasAddresses, {
        registered: !!db.naverProductId,
        statusType: db.naver_status_type ?? null,
      });
      const reviewApproved = ((db.reviewChecklist as ReviewChecklist | null) ?? null)?.approved === true;
      return { id: db.id, ready: r.ready, passed: r.passed, total: r.total, reviewApproved };
    });

    return NextResponse.json({ success: true, items });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
