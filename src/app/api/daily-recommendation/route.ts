// /api/daily-recommendation — Vercel Cron: KST 08:00 (UTC 23:00)
// Sends #🌸꼬띠-오늘추천 to Discord

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calcHoneyScore } from '@/lib/honey-score';
import { sendDiscord, buildRecommendEmbed, getSeasonContext } from '@/lib/discord';


export const dynamic = 'force-dynamic';
export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const rawProducts = await prisma.product.findMany({
      where: { status: { notIn: ['INACTIVE'] }, salePrice: { gt: 0 }, supplierPrice: { gt: 0 } },
      include: { supplier: { select: { name: true } } },
      orderBy: { updatedAt: 'desc' },
      take: 200,
    });

    const scored = rawProducts.map(p => ({
      ...p,
      hs: calcHoneyScore({
        salePrice: p.salePrice, supplierPrice: p.supplierPrice ?? 0,
        categoryId: p.naverCategoryCode ?? '', productName: p.name,
        keywords: Array.isArray(p.keywords) ? p.keywords as string[] : [],
        tags: Array.isArray(p.tags) ? p.tags as string[] : [],
        hasMainImage: !!p.mainImage,
      }),
    }));

    const top3 = [...scored].sort((a, b) => b.hs.total - a.hs.total).slice(0, 3);
    const season = getSeasonContext() as any;
    const seasonTop2 = season
      ? scored
          .filter(p => (season.words ?? []).some((w: string) => p.name.includes(w)))
          .sort((a, b) => b.hs.total - a.hs.total)
          .slice(0, 2)
      : [];

    const today = new Date().toLocaleDateString('ko-KR', {
      year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
    });

    const embed = buildRecommendEmbed({
      today,
      top3: top3.map(p => ({
        name: p.name,
        score: p.hs.total,
        grade: p.hs.grade,
        netMarginRate: p.hs.netMarginRate,
        supplierName: p.supplier?.name,
      })),
      season: season ? { label: season.label, daysLeft: season.daysLeft } : null,
      seasonTop2: seasonTop2.map(p => ({ name: p.name, score: p.hs.total })),
      appUrl: process.env.NEXT_PUBLIC_APP_URL,
    });

    const result = await sendDiscord('KKOTTI_RECOMMEND', '', [embed]);

    // Persist to daily_recommendations
    try {
      await prisma.$executeRaw`
        INSERT INTO daily_recommendations (date, top_products, season_label, created_at)
        VALUES (
          CURRENT_DATE,
          ${JSON.stringify(top3.map(p => ({ id: p.id, name: p.name, score: p.hs.total })))}::jsonb,
          ${season?.label ?? null},
          NOW()
        )
        ON CONFLICT (date) DO UPDATE SET
          top_products = EXCLUDED.top_products,
          created_at   = NOW()
      `;
    } catch { /* non-critical */ }

    return NextResponse.json({
      success: true,
      sent: result.ok,
      discordStatus: result.status,
      top3: top3.map(p => ({ id: p.id, name: p.name, score: p.hs.total, grade: p.hs.grade })),
      season: season ? { label: season.label, daysLeft: season.daysLeft } : null,
    });
  } catch (err) {
    console.error('[daily-recommendation]', err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}

export const POST = GET;
