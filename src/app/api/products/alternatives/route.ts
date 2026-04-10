// API: /api/products/alternatives
// GET  ?productId=xxx  → list alternatives for a product
// POST                 → create alternative
// PATCH ?id=xxx        → update alternative
// DELETE ?id=xxx       → delete alternative

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendDiscord } from '@/lib/discord';


export const dynamic = 'force-dynamic';
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const productId = searchParams.get('productId');
  if (!productId) return NextResponse.json({ error: 'productId required' }, { status: 400 });

  try {
    const alts = await prisma.$queryRaw<any[]>`
      SELECT
        pa.*,
        s.name  AS supplier_name,
        s.code  AS supplier_code,
        s."platformUrl" AS supplier_platform_url
      FROM product_alternatives pa
      LEFT JOIN "Supplier" s ON s.id = pa.supplier_id
      WHERE pa.product_id = ${productId}
        AND pa.is_active = true
      ORDER BY pa.priority ASC, pa.created_at ASC
    `;
    return NextResponse.json({ success: true, alternatives: alts });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      productId,
      altProductName,
      supplierId,
      platformCode,
      platformProductCode,
      platformUrl,
      memo,
      similarityScore,
      priceDiff,
      stockCount,
      autoSwitch,
      priority,
    } = body;

    if (!productId) return NextResponse.json({ error: 'productId required' }, { status: 400 });

    // Get next priority if not provided
    const [{ max_pri }] = await prisma.$queryRaw<{ max_pri: number | null }[]>`
      SELECT MAX(priority) as max_pri FROM product_alternatives WHERE product_id = ${productId}
    `;
    const nextPriority = priority ?? ((max_pri ?? 0) + 1);

    const [alt] = await prisma.$queryRaw<any[]>`
      INSERT INTO product_alternatives (
        product_id, priority, alt_product_name, supplier_id,
        platform_code, platform_product_code, platform_url, memo,
        similarity_score, price_diff, stock_count, auto_switch
      ) VALUES (
        ${productId}, ${nextPriority}, ${altProductName ?? null}, ${supplierId ?? null},
        ${platformCode ?? null}, ${platformProductCode ?? null}, ${platformUrl ?? null}, ${memo ?? null},
        ${similarityScore ?? 0}, ${priceDiff ?? 0}, ${stockCount ?? null}, ${autoSwitch ?? false}
      )
      RETURNING *
    `;

    // Get original product name for Discord notification
    const product = await prisma.product.findUnique({ where: { id: productId }, select: { name: true, status: true } });
    if (product?.status === 'OUT_OF_STOCK') {
      // Send stock alert if product is already OOS
      await sendDiscord(
        'STOCK_ALERT',
        '',
        [{
          title: ':white_check_mark: 대체상품 등록 완료',
          description: `**${product.name}** 품절 상품에 대체상품이 등록되었어요!`,
          color: 0x16a34a,
          fields: [
            { name: '대체상품', value: altProductName ?? '미입력', inline: true },
            { name: '공급사', value: platformCode ?? '미입력', inline: true },
            ...(platformUrl ? [{ name: 'URL', value: platformUrl, inline: false }] : []),
          ],
          timestamp: new Date().toISOString(),
        }]
      );
    }

    return NextResponse.json({ success: true, alternative: alt });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  try {
    const body = await req.json();
    const sets: string[] = [];
    const vals: any[] = [];
    let idx = 1;

    const fields: Record<string, any> = {
      alt_product_name:      body.altProductName,
      supplier_id:           body.supplierId,
      platform_code:         body.platformCode,
      platform_product_code: body.platformProductCode,
      platform_url:          body.platformUrl,
      memo:                  body.memo,
      similarity_score:      body.similarityScore ?? 0,
      price_diff:            body.priceDiff,
      stock_count:           body.stockCount,
      auto_switch:           body.autoSwitch,
      priority:              body.priority,
      // v2 concrete fields
      alt_supply_price:      body.altSupplyPrice,
      alt_sale_price:        body.altSalePrice,
      alt_stock_status:      body.altStockStatus,
    };

    for (const [col, val] of Object.entries(fields)) {
      if (val !== undefined) { sets.push(`${col} = $${idx++}`); vals.push(val); }
    }
    sets.push(`updated_at = NOW()`);
    vals.push(id);

    if (sets.length === 1) return NextResponse.json({ success: true, message: 'No changes' });

    // Raw SQL update (Prisma doesn't know this table from schema)
    await prisma.$executeRawUnsafe(
      `UPDATE product_alternatives SET ${sets.join(', ')} WHERE id = $${idx}`,
      ...vals
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  try {
    await prisma.$executeRaw`
      UPDATE product_alternatives SET is_active = false, updated_at = NOW() WHERE id = ${id}
    `;
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
