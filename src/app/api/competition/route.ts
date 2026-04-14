// src/app/api/competition/route.ts
// D-3: Competition monitoring API
// GET  /api/competition — get all products' competition snapshots
// POST /api/competition — run competition check for all active products

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  takeCompetitorSnapshot,
  detectChanges,
  buildCompetitionAlertEmbed,
  type CompetitorSnapshot,
  type PriceChangeAlert,
} from '@/lib/competition-monitor';
import { sendDiscord } from '@/lib/discord';

export const dynamic = 'force-dynamic';

// In-memory snapshot storage (persisted per deployment lifecycle)
const snapshotStore = new Map<string, {
  previous: CompetitorSnapshot | null;
  current: CompetitorSnapshot;
}>();

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      where: { status: { in: ['ACTIVE', 'DRAFT'] } },
      select: {
        id: true,
        name: true,
        naver_title: true,
        salePrice: true,
        keywords: true,
        status: true,
        naverProductId: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const results = products.map(p => {
      const stored = snapshotStore.get(p.id);
      const kw = p.keywords;
      const kwArr = Array.isArray(kw) ? kw : (typeof kw === 'string' && kw ? kw.split(',').map(k => k.trim()).filter(Boolean) : []);
      const keyword = String(kwArr[0] ?? '') || p.naver_title || p.name;
      return {
        productId: p.id,
        productName: p.naver_title ?? p.name,
        keyword,
        myPrice: p.salePrice,
        status: p.status,
        naverProductId: p.naverProductId,
        snapshot: stored?.current ?? null,
        previousSnapshot: stored?.previous ?? null,
        hasData: !!stored,
      };
    });

    return NextResponse.json({
      success: true,
      totalTracked: results.length,
      withData: results.filter(r => r.hasData).length,
      products: results,
      lastCheck: results.find(r => r.snapshot)?.snapshot?.timestamp ?? null,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const products = await prisma.product.findMany({
      where: { status: { in: ['ACTIVE', 'DRAFT'] } },
      select: {
        id: true,
        name: true,
        naver_title: true,
        salePrice: true,
        keywords: true,
      },
    });

    if (products.length === 0) {
      return NextResponse.json({ success: true, message: 'No products to monitor', alerts: [] });
    }

    const alerts: PriceChangeAlert[] = [];
    const snapshots: CompetitorSnapshot[] = [];
    const errors: string[] = [];

    for (const product of products) {
      const kw = product.keywords;
      const kwArr = Array.isArray(kw) ? kw : (typeof kw === 'string' && kw ? kw.split(',').map(k => k.trim()).filter(Boolean) : []);
      const keyword = String(kwArr[0] ?? '') || product.naver_title || product.name;

      if (!keyword) continue;

      try {
        await new Promise(r => setTimeout(r, 300));

        const snapshot = await takeCompetitorSnapshot(keyword);
        snapshots.push(snapshot);

        const stored = snapshotStore.get(product.id);
        if (stored?.current) {
          const alert = detectChanges(
            snapshot,
            stored.current,
            product.salePrice,
            product.naver_title ?? product.name,
          );
          if (alert) alerts.push(alert);
        }

        snapshotStore.set(product.id, {
          previous: stored?.current ?? null,
          current: snapshot,
        });
      } catch (err) {
        errors.push(`${product.name}: ${err instanceof Error ? err.message : 'failed'}`);
      }
    }

    if (alerts.length > 0) {
      const embed = buildCompetitionAlertEmbed(alerts);
      await sendDiscord('PRICE_CHANGE', '', [embed]);
    }

    return NextResponse.json({
      success: true,
      totalChecked: products.length,
      alertCount: alerts.length,
      alerts,
      snapshots: snapshots.map(s => ({
        query: s.query,
        avgPrice: s.avgPrice,
        totalResults: s.totalResults,
        competitionLevel: s.competitionLevel,
      })),
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
