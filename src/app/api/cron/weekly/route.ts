// src/app/api/cron/weekly/route.ts
// Weekly ops report — runs every Monday at 08:00 KST (23:00 UTC Sunday)
// Sends summary to #📊운영-리포트 Discord channel
// Also: Domeggook supplier price drift detection (weekly re-check)

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calcHoneyScore } from '@/lib/honey-score';
import { sendDiscord, buildWeeklyReportEmbed } from '@/lib/discord';

// ── Domeggook API ──────────────────────────────────────────────────────────
const DOMEGGOOK_API = 'https://domeggook.com/ssl/api';

/** Extract Domeggook product number from URL e.g. https://domeme.domeggook.com/s/55884601 → '55884601' */
function extractProductNo(url: string): string | null {
  const m = url.match(/\/s\/(\d+)/);
  return m ? m[1] : null;
}

/** Fetch current supplier price from Domeggook OpenAPI */
async function fetchDomeggookPrice(productNo: string, apiKey: string): Promise<number | null> {
  try {
    const url = `${DOMEGGOOK_API}/?ver=4.5&mode=getItemView&aid=${apiKey}&no=${productNo}&om=json`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const data = await res.json();
    const item = data?.domeggook?.item ?? data?.item;
    if (!item) return null;
    // Price field: unitPrice or minPrice
    const price = Number(item.unitPrice ?? item.minPrice ?? 0);
    return price > 0 ? price : null;
  } catch {
    return null;
  }
}


export const dynamic = 'force-dynamic';
function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return req.headers.get('authorization') === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Product counts by status
    const statusCounts = await prisma.product.groupBy({
      by: ['status'],
      _count: { id: true },
    });
    const cm: Record<string, number> = {};
    for (const r of statusCounts) cm[r.status] = r._count.id;

    const totalProducts   = Object.values(cm).reduce((s, n) => s + n, 0);
    const activeProducts  = cm['ACTIVE']        ?? 0;
    const oosProducts     = cm['OUT_OF_STOCK']  ?? 0;

    // New products registered this week
    const newRegistered = await prisma.product.count({
      where: { createdAt: { gte: weekAgo } },
    });

    // Order stats this week (B-5 enhancement)
    let weekRevenue = 0;
    let weekOrderCount = 0;
    let weekCancelCount = 0;
    let weekNetProfit = 0;
    try {
      const weekOrders = await (prisma as any).order.findMany({
        where: { createdAt: { gte: weekAgo } },
        select: { totalAmount: true, status: true },
      });
      weekOrderCount  = weekOrders.filter((o: any) => !['CANCELLED','CANCEL_REQUESTED','RETURNED','RETURN_REQUESTED'].includes(o.status)).length;
      weekCancelCount = weekOrders.filter((o: any) => ['CANCELLED','RETURNED'].includes(o.status)).length;
      weekRevenue     = weekOrders
        .filter((o: any) => !['CANCELLED','CANCEL_REQUESTED','RETURNED','RETURN_REQUESTED'].includes(o.status))
        .reduce((s: number, o: any) => s + (Number(o.totalAmount) || 0), 0);
      // Estimated net profit: revenue * (1 - naver fee 5.733% - avg supply ratio 40%)
      weekNetProfit = Math.round(weekRevenue * (1 - 0.05733 - 0.4));
    } catch { /* order table may not exist yet */ }

    // Price change events this week
    const priceChanges = await prisma.productEvent.count({
      where: { type: 'PRICE_CHANGE', createdAt: { gte: weekAgo } },
    });

    // Average honey score across active products
    const activeRaw = await prisma.product.findMany({
      where: { status: 'ACTIVE', salePrice: { gt: 0 }, supplierPrice: { gt: 0 } },
      select: {
        salePrice: true, supplierPrice: true, naverCategoryCode: true,
        name: true, keywords: true, tags: true, mainImage: true,
      },
    });

    let avgHoneyScore = 0;
    let topProduct: { name: string; score: number } | undefined;

    if (activeRaw.length > 0) {
      const scores = activeRaw.map(p => ({
        name:  p.name,
        score: calcHoneyScore({
          salePrice:     p.salePrice,
          supplierPrice: p.supplierPrice,
          categoryId:    p.naverCategoryCode ?? '',
          productName:   p.name,
          keywords:      Array.isArray(p.keywords) ? (p.keywords as string[]) : [],
          tags:          Array.isArray(p.tags)     ? (p.tags     as string[]) : [],
          hasMainImage:  !!p.mainImage,
        }).total,
      }));
      avgHoneyScore = Math.round(scores.reduce((s, x) => s + x.score, 0) / scores.length);
      topProduct = scores.sort((a, b) => b.score - a.score)[0];
    }

    // Week label
    const weekLabel = `${weekAgo.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })} ~ ${now.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}`;

    // ── Domeggook supplier price drift detection ───────────────────────
    // Re-fetch current price from Domeggook API for all crawl_logs items
    // Detect >= 5% drift and alert via Discord
    const priceDrifts: Array<{ name: string; productNo: string; oldPrice: number; newPrice: number; changeRate: number; linked: boolean }> = [];
    let priceDriftChecked = 0;
    try {
      // Get API key from store_settings
      const settingsRows = await prisma.$queryRaw<{ domeggook_api_key: string }[]>`
        SELECT domeggook_api_key FROM store_settings WHERE id = 'default' LIMIT 1
      `;
      const apiKey = settingsRows[0]?.domeggook_api_key?.trim();

      if (apiKey) {
        // Fetch crawl_logs with domeggook URLs (SOURCED or PENDING, not REGISTERED)
        const crawlTargets = await (prisma as any).crawlLog.findMany({
          where: {
            sourcingStatus: { in: ['SOURCED', 'PENDING'] },
            supplierPrice: { gt: 0 },
            url: { contains: 'domeggook.com' },
          },
          select: { id: true, url: true, name: true, supplierPrice: true, productId: true },
          take: 20, // limit per week to avoid API rate limits
        });

        priceDriftChecked = crawlTargets.length;

        for (const item of crawlTargets) {
          const productNo = extractProductNo(item.url);
          if (!productNo) continue;

          const currentPrice = await fetchDomeggookPrice(productNo, apiKey);
          if (!currentPrice) continue;

          const oldPrice = item.supplierPrice as number;
          const changeRate = (currentPrice - oldPrice) / oldPrice;

          // Alert threshold: >= 5% change (up or down)
          if (Math.abs(changeRate) >= 0.05) {
            priceDrifts.push({
              name:       (item.name as string) ?? productNo,
              productNo,
              oldPrice,
              newPrice:   currentPrice,
              changeRate: Math.round(changeRate * 1000) / 10, // e.g. 12.3%
              linked:     !!(item.productId),
            });

            // Update crawl_log price
            await (prisma as any).crawlLog.update({
              where: { id: item.id },
              data:  { supplierPrice: currentPrice },
            }).catch(() => null);

            // If linked to a registered product, record PRICE_CHANGE event
            if (item.productId) {
              await prisma.productEvent.create({
                data: {
                  productId: item.productId as string,
                  type:      'PRICE_CHANGE',
                  oldValue:  String(oldPrice),
                  newValue:  String(currentPrice),
                  note:      `Domeggook weekly check: ${changeRate > 0 ? '+' : ''}${(changeRate * 100).toFixed(1)}%`,
                },
              }).catch(() => null);
            }
          }
        }

        // Send Discord alert if any drifts found
        if (priceDrifts.length > 0) {
          const driftLines = priceDrifts.map(d =>
            `${d.changeRate > 0 ? '\u2191' : '\u2193'} **${d.name.slice(0, 20)}** ${d.oldPrice.toLocaleString()}\uC6D0 \u2192 ${d.newPrice.toLocaleString()}\uC6D0 (${d.changeRate > 0 ? '+' : ''}${d.changeRate}%)${d.linked ? ' [\uB4F1\uB85D\uC0C1\uD488]' : ''}`
          ).join('\n');
          await sendDiscord('STOCK_ALERT', '', [{
            title:       `\uACF5\uAE09\uAC00 \uBCC0\uB3D9 \uAC10\uC9C0 ${priceDrifts.length}\uAC74 \u2014 \uB9C8\uC9C4 \uC7AC\uAC80\uD1A0 \uD544\uC694`,
            description: driftLines,
            color:       0xe6a310,
          }]).catch(() => null);
        }
      }
    } catch { /* non-critical: price drift check failure should not block weekly report */ }

    const embed = buildWeeklyReportEmbed({
      weekLabel,
      totalProducts,
      activeProducts,
      oosProducts,
      newRegistered,
      avgHoneyScore,
      topProduct,
      noAltOosCount: oosProducts,
      priceChanges,
      weekRevenue,
      weekOrderCount,
      weekCancelCount,
      weekNetProfit,
    });

    const result = await sendDiscord('OPS_REPORT', '', [embed]);

    return NextResponse.json({
      ok:        result.ok,
      timestamp: new Date().toISOString(),
      weekLabel,
      stats: { totalProducts, activeProducts, oosProducts, newRegistered, avgHoneyScore, priceChanges, weekRevenue, weekOrderCount, weekCancelCount, weekNetProfit },
      priceDrift: { checked: priceDriftChecked, drifts: priceDrifts.length, items: priceDrifts },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[cron/weekly] error:', msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
