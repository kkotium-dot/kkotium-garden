// POST /api/naver/sync  — bulk sync all ACTIVE products' price+status to Naver
// GET  /api/naver/sync  — sync status overview

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { updateProductPriceStatus, checkNaverConnection } from '@/lib/naver/api-client';


export const dynamic = 'force-dynamic';
export async function POST(request: NextRequest) {
  try {
    // Read the body ONCE (stream is single-use). Both the auth guard (manual)
    // and the dryRun gate read from this parsed object.
    const body = await request.json().catch(() => ({} as any));

    // Auth guard for programmatic calls
    const authHeader = request.headers.get('authorization');
    const isCron = !!process.env.CRON_SECRET;
    if (isCron && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      // Allow unauthenticated calls from the dashboard (manual trigger)
      if (!body.manual) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    // dryRun 옵션 — 실 PUT 없이 GET-merge 결과만 미리보기(비가역 게이트, 규칙 3-7).
    const dryRun = body?.dryRun === true;

    // Check API connectivity first
    const conn = await checkNaverConnection();
    if (!conn.ok) {
      return NextResponse.json({
        success: false,
        error: conn.error,
        hint: 'NAVER_CLIENT_ID / NAVER_CLIENT_SECRET을 .env.local에 추가해주세요',
      }, { status: 503 });
    }

    // Fetch all ACTIVE products that have a naverProductId
    // Use raw query to avoid Prisma type conflicts with naverProductId field
    const products = await prisma.$queryRaw<Array<{
      id: string; name: string; salePrice: number; naverProductId: string;
    }>>`
      SELECT id, name, "salePrice", "naverProductId"
      FROM "Product"
      WHERE status = 'ACTIVE'
        AND "naverProductId" IS NOT NULL
        AND "naverProductId" != ''
    `;

    let synced  = 0;
    let failed  = 0;
    const errors: string[] = [];

    for (const product of products) {
      try {
        const naverProductId = (product as any).naverProductId;
        if (!naverProductId) continue;

        // 규칙 3-7 · §4-C systemic (#62): PUT은 FULL REPLACE 이므로 부분 payload는
        // 상품명·이미지·옵션·상세를 통째로 소실시킴. GET-merge 헬퍼로 현재 네이버
        // 전체 상태를 읽어 salePrice + statusType='SALE' 만 덮어쓰고 전체 재전송.
        // (이전 코드는 detailContent:''·images:{representativeImageUrl:''} 등을 보내
        //  등록 전파괴 위험 — 이번에 제거.)
        await updateProductPriceStatus(
          naverProductId,
          { salePrice: product.salePrice, statusType: 'SALE' },
          { dryRun },
        );
        synced++;
      } catch (e: any) {
        failed++;
        errors.push(`${product.name}: ${e.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      dryRun,
      synced,
      failed,
      total: products.length,
      errors: errors.slice(0, 5), // cap error list
      message: dryRun
        ? `동기화 미리보기(GET-merge) — 대상 ${synced}개, 실패 ${failed}개 (PUT 미실행)`
        : `동기화 완료 — 성공 ${synced}개, 실패 ${failed}개`,
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const countRows = await prisma.$queryRaw<Array<{ status: string; cnt: bigint }>>`
      SELECT status, COUNT(*) AS cnt FROM "Product" GROUP BY status
    `;
    const cm: Record<string, number> = {};
    for (const r of countRows) cm[r.status] = Number(r.cnt);
    const totalActive    = cm['ACTIVE'] ?? 0;
    const oos            = cm['OUT_OF_STOCK'] ?? 0;

    const [{ cnt: naverCnt }] = await prisma.$queryRaw<Array<{ cnt: bigint }>>`
      SELECT COUNT(*) AS cnt FROM "Product"
      WHERE status = 'ACTIVE' AND "naverProductId" IS NOT NULL AND "naverProductId" != ''
    `;
    const naverRegistered = Number(naverCnt);

    // Check if API keys are configured
    const apiReady = !!(process.env.NAVER_CLIENT_ID && process.env.NAVER_CLIENT_SECRET);

    return NextResponse.json({
      success: true,
      apiReady,
      status: {
        lastSync:          new Date().toISOString(),
        totalActive,
        naverRegistered,
        outOfStock:        oos,
        pendingRegistration: totalActive - naverRegistered,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
