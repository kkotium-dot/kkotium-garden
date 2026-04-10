import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/crawler/logs?limit=50&status=SOURCED&seller=gseller2022&source=single
// Returns sourcing shelf items from crawl_logs

export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit  = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 200);
    const status = searchParams.get('status');   // SOURCED | PENDING | REGISTERED | all
    const seller = searchParams.get('seller');   // filter by seller_id
    const source = searchParams.get('source');   // single | bulk | all

    // Build WHERE clauses
    const conditions: string[] = [];
    if (status && status !== 'all') conditions.push(`sourcing_status = '${status}'`);
    if (seller) conditions.push(`seller_id = '${seller}'`);
    if (source && source !== 'all') conditions.push(`source = '${source}'`);
    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const rows = await prisma.$queryRawUnsafe<Array<{
      id: string; url: string; name: string | null;
      supplier_price: number; images: unknown; options: unknown;
      status: string; error_msg: string | null;
      source: string; crawled_at: Date;
      seller_nick: string | null; seller_id: string | null; seller_rank: number | null;
      category_name: string | null; category_code: string | null;
      inventory: number | null; ship_fee: number | null; can_merge: boolean | null;
      sourcing_status: string; product_id: string | null;
    }>>(`
      SELECT
        id, url, name, supplier_price, images, options, status, error_msg, source, crawled_at,
        seller_nick, seller_id, seller_rank, category_name, category_code,
        inventory, ship_fee, can_merge, sourcing_status, product_id
      FROM crawl_logs
      ${where}
      ORDER BY crawled_at DESC
      LIMIT ${limit}
    `);

    // Group by seller for the UI
    const sellerGroups: Record<string, string> = {};
    rows.forEach(r => {
      if (r.seller_id && r.seller_nick) sellerGroups[r.seller_id] = r.seller_nick;
    });

    return NextResponse.json({ success: true, logs: rows, sellerGroups });
  } catch (e: unknown) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}

// PATCH /api/crawler/logs — update sourcing_status
// Single: { id: string, sourcingStatus: string, productId?: string }
// Batch by URL: { urls: string[], sourcingStatus: string }
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { sourcingStatus } = body;
    if (!sourcingStatus) {
      return NextResponse.json({ success: false, error: 'sourcingStatus required' }, { status: 400 });
    }

    // Batch update by URLs (for bulk tab "save to shelf")
    if (body.urls && Array.isArray(body.urls) && body.urls.length > 0) {
      const urls = body.urls as string[];
      let updated = 0;
      for (const url of urls) {
        const res = await prisma.$executeRaw`
          UPDATE crawl_logs SET sourcing_status = ${sourcingStatus}
          WHERE url = ${url} AND sourcing_status = 'SOURCED'
        `;
        updated += Number(res);
      }
      return NextResponse.json({ success: true, updated });
    }

    // Single update by id
    const { id, productId } = body;
    if (!id) {
      return NextResponse.json({ success: false, error: 'id or urls required' }, { status: 400 });
    }

    if (productId) {
      await prisma.$executeRaw`
        UPDATE crawl_logs
        SET sourcing_status = ${sourcingStatus}, product_id = ${productId}
        WHERE id = ${id}
      `;
    } else {
      await prisma.$executeRaw`
        UPDATE crawl_logs SET sourcing_status = ${sourcingStatus} WHERE id = ${id}
      `;
    }

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}

// DELETE /api/crawler/logs?id=xxx — remove from shelf
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 });

    await prisma.$executeRaw`DELETE FROM crawl_logs WHERE id = ${id}`;
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
