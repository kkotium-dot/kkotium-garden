// src/app/api/product-lifecycle/route.ts
// E-3: Product lifecycle analysis API
// Calculates lifecycle stage, zombie risk, sales velocity for all products
// Used by ProductLifecycleWidget on dashboard

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Lifecycle stages based on age + sales performance
type LifecycleStage = 'NEW' | 'GROWING' | 'PEAK' | 'DECLINING' | 'ZOMBIE';

interface ProductLifecycle {
  id: string;
  name: string;
  sku: string;
  status: string;
  createdAt: string;
  ageDays: number;
  salesCount: number;
  lastSaleDate: string | null;
  daysSinceLastSale: number | null;
  salesVelocity: number; // sales per 30 days
  honeyScore: number;
  stage: LifecycleStage;
  zombieRisk: number; // 0~100
  suggestion: string;
}

function calcLifecycleStage(ageDays: number, salesCount: number, daysSinceLastSale: number | null, velocity: number): LifecycleStage {
  // No sales and old = zombie
  if (ageDays > 30 && salesCount === 0) return 'ZOMBIE';
  if (daysSinceLastSale !== null && daysSinceLastSale > 45 && velocity < 0.5) return 'ZOMBIE';
  if (daysSinceLastSale !== null && daysSinceLastSale > 30 && velocity < 1) return 'DECLINING';

  // New product (< 14 days)
  if (ageDays <= 14) return 'NEW';

  // Growing (sales increasing or steady)
  if (velocity >= 3) return 'PEAK';
  if (velocity >= 1) return 'GROWING';

  // Low velocity but not dead yet
  if (ageDays > 14 && velocity < 1) return 'DECLINING';

  return 'GROWING';
}

function calcZombieRisk(ageDays: number, salesCount: number, daysSinceLastSale: number | null, velocity: number): number {
  let risk = 0;

  // Age factor: older products with no sales = higher risk
  if (ageDays > 60) risk += 20;
  else if (ageDays > 30) risk += 10;

  // No sales ever
  if (salesCount === 0) risk += 30;

  // Days since last sale
  if (daysSinceLastSale !== null) {
    if (daysSinceLastSale > 60) risk += 30;
    else if (daysSinceLastSale > 30) risk += 20;
    else if (daysSinceLastSale > 14) risk += 10;
  } else if (ageDays > 14) {
    // Never sold + old
    risk += 25;
  }

  // Low velocity
  if (velocity < 0.3) risk += 15;
  else if (velocity < 1) risk += 5;

  return Math.min(100, risk);
}

function getSuggestion(stage: LifecycleStage, zombieRisk: number, ageDays: number, salesCount: number): string {
  switch (stage) {
    case 'ZOMBIE':
      return salesCount === 0
        ? 'No sales since registration. Consider SEO optimization or removal.'
        : 'Sales stopped. Refresh keywords, lower price, or replace with new product.';
    case 'DECLINING':
      return 'Sales declining. Update product name/keywords or run a promotion.';
    case 'NEW':
      return ageDays < 3
        ? 'Just registered. Monitor search ranking for 3-7 days.'
        : 'Building exposure. Optimize SEO tags and check keyword ranking.';
    case 'GROWING':
      return 'Healthy growth. Maintain current strategy and add reviews.';
    case 'PEAK':
      return 'Top performer! Consider bundle deals or related product cross-sell.';
    default:
      return '';
  }
}

export async function GET() {
  try {
    const now = new Date();

    // Fetch all non-inactive products with order data
    const products = await prisma.product.findMany({
      where: { status: { not: 'INACTIVE' } },
      select: {
        id: true,
        name: true,
        sku: true,
        status: true,
        createdAt: true,
        salesCount: true,
        lastSaleDate: true,
        aiScore: true,
        naverProductId: true,
        orderItems: {
          select: { createdAt: true, quantity: true },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const lifecycles: ProductLifecycle[] = products.map(p => {
      const ageDays = Math.floor((now.getTime() - p.createdAt.getTime()) / (1000 * 60 * 60 * 24));

      const lastSale = p.lastSaleDate ?? (p.orderItems.length > 0 ? p.orderItems[0].createdAt : null);
      const daysSinceLastSale = lastSale
        ? Math.floor((now.getTime() - lastSale.getTime()) / (1000 * 60 * 60 * 24))
        : null;

      // Sales velocity: orders in last 30 days
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const recentSales = p.orderItems
        .filter(oi => oi.createdAt >= thirtyDaysAgo)
        .reduce((sum, oi) => sum + oi.quantity, 0);
      const salesVelocity = recentSales; // per 30 days

      const totalSales = p.salesCount > 0 ? p.salesCount : p.orderItems.reduce((s, oi) => s + oi.quantity, 0);

      const stage = calcLifecycleStage(ageDays, totalSales, daysSinceLastSale, salesVelocity);
      const zombieRisk = calcZombieRisk(ageDays, totalSales, daysSinceLastSale, salesVelocity);
      const suggestion = getSuggestion(stage, zombieRisk, ageDays, totalSales);

      return {
        id: p.id,
        name: p.name,
        sku: p.sku,
        status: p.status,
        createdAt: p.createdAt.toISOString(),
        ageDays,
        salesCount: totalSales,
        lastSaleDate: lastSale?.toISOString() ?? null,
        daysSinceLastSale,
        salesVelocity,
        honeyScore: p.aiScore ?? 0,
        stage,
        zombieRisk,
        suggestion,
      };
    });

    // Summary stats
    const stageCounts = {
      NEW: lifecycles.filter(l => l.stage === 'NEW').length,
      GROWING: lifecycles.filter(l => l.stage === 'GROWING').length,
      PEAK: lifecycles.filter(l => l.stage === 'PEAK').length,
      DECLINING: lifecycles.filter(l => l.stage === 'DECLINING').length,
      ZOMBIE: lifecycles.filter(l => l.stage === 'ZOMBIE').length,
    };

    const avgZombieRisk = lifecycles.length > 0
      ? Math.round(lifecycles.reduce((s, l) => s + l.zombieRisk, 0) / lifecycles.length)
      : 0;

    return NextResponse.json({
      ok: true,
      total: lifecycles.length,
      stageCounts,
      avgZombieRisk,
      products: lifecycles,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
