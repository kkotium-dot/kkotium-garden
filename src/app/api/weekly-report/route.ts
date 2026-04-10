// /api/weekly-report — Vercel Cron: Monday KST 08:00 (UTC Sunday 23:00)
// Sends #📊운영-리포트 weekly summary to Discord

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calcHoneyScore } from '@/lib/honey-score';
import { sendDiscord, buildWeeklyReportEmbed } from '@/lib/discord';


export const dynamic = 'force-dynamic';
export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 86_400_000);
    const weekLabel = `${weekAgo.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })} ~ ${now.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}`;

    // All products stats
    const allProducts = await prisma.product.findMany({
      where: { status: { notIn: ['INACTIVE'] } },
      select: { id: true, name: true, status: true, salePrice: true, supplierPrice: true,
                naverCategoryCode: true, keywords: true, tags: true, mainImage: true,
                createdAt: true },
    });

    const totalProducts   = allProducts.length;
    const activeProducts  = allProducts.filter(p => p.status === 'ACTIVE').length;
    const oosProducts     = allProducts.filter(p => p.status === 'OUT_OF_STOCK').length;
    const newRegistered   = allProducts.filter(p => p.createdAt >= weekAgo).length;

    // Score all & find top
    const scored = allProducts
      .filter(p => p.salePrice > 0 && (p.supplierPrice ?? 0) > 0)
      .map(p => ({
        id: p.id, name: p.name,
        score: calcHoneyScore({
          salePrice: p.salePrice, supplierPrice: p.supplierPrice ?? 0,
          categoryId: p.naverCategoryCode ?? '', productName: p.name,
          keywords: Array.isArray(p.keywords) ? p.keywords as string[] : [],
          tags: Array.isArray(p.tags) ? p.tags as string[] : [],
          hasMainImage: !!p.mainImage,
        }).total,
      }));

    const avgHoneyScore = scored.length > 0
      ? Math.round(scored.reduce((a, p) => a + p.score, 0) / scored.length)
      : 0;
    const topProduct = scored.sort((a, b) => b.score - a.score)[0] ?? null;

    // OOS without alternatives
    const oosIds = allProducts.filter(p => p.status === 'OUT_OF_STOCK').map(p => p.id);
    let noAltOosCount = 0;
    if (oosIds.length > 0) {
      const alts = await prisma.$queryRaw<{ product_id: string }[]>`
        SELECT DISTINCT product_id FROM product_alternatives
        WHERE product_id = ANY(${oosIds}) AND is_active = true
      `;
      const hasAltIds = new Set(alts.map(a => a.product_id));
      noAltOosCount = oosIds.filter(id => !hasAltIds.has(id)).length;
    }

    // Price changes this week
    const priceChanges = await prisma.$queryRaw<{ count: string }[]>`
      SELECT COUNT(*)::text as count FROM supplier_price_log
      WHERE detected_at >= ${weekAgo}
    `.catch(() => [{ count: '0' }]);
    const priceChangeCount = parseInt((priceChanges[0]?.count ?? '0'), 10);

    const embed = buildWeeklyReportEmbed({
      weekLabel,
      totalProducts,
      activeProducts,
      oosProducts,
      newRegistered,
      avgHoneyScore,
      topProduct: topProduct ? { name: topProduct.name, score: topProduct.score } : undefined,
      noAltOosCount,
      priceChanges: priceChangeCount,
    });

    const result = await sendDiscord('OPS_REPORT', '', [embed]);

    return NextResponse.json({
      success: true,
      sent: result.ok,
      stats: { totalProducts, activeProducts, oosProducts, newRegistered, avgHoneyScore, noAltOosCount, priceChangeCount },
    });
  } catch (err) {
    console.error('[weekly-report]', err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}

export const POST = GET;
