// GET /api/crawler/check-productized?url=<sourceUrl>
// SEED-SAVE C-3 Step 4 (#55) — re-crawl duplicate guard. Returns whether the
// given source URL already has a crawl_log linked to a 창고 Product (product_id
// set), plus that product's name/status so the UI can show a non-blocking
// "이미 'OO'으로 상품화됨" notice with a link. Detection is purely
// url-match AND product_id IS NOT NULL — it never blocks crawling.

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url).searchParams.get('url')?.trim();
    if (!url) {
      return NextResponse.json({ success: false, error: 'url required' }, { status: 400 });
    }

    // Most recent linked crawl_log for this URL + the Product it became.
    const rows = await prisma.$queryRaw<Array<{
      product_id: string; name: string | null; status: string | null; naver_product_id: string | null;
    }>>`
      SELECT cl.product_id, p."name", p."status", p."naverProductId" AS naver_product_id
      FROM crawl_logs cl
      JOIN "Product" p ON p.id = cl.product_id
      WHERE cl.url = ${url} AND cl.product_id IS NOT NULL
      ORDER BY cl.crawled_at DESC
      LIMIT 1
    `;

    if (rows.length === 0) {
      return NextResponse.json({ success: true, productized: false });
    }
    const r = rows[0];
    return NextResponse.json({
      success: true,
      productized: true,
      productId: r.product_id,
      productName: r.name ?? '(이름 없음)',
      productStatus: r.status ?? null,
      naverProductId: r.naver_product_id ?? null,
    });
  } catch (e: unknown) {
    // Non-blocking guard — never fail the crawl flow on a check error.
    return NextResponse.json({ success: false, error: String(e) }, { status: 200 });
  }
}
