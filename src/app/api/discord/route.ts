// /api/discord — Test all 5 Discord channels
// GET/POST: sends test messages to all channels, returns results

import { NextResponse } from 'next/server';
import { sendDiscord, DISCORD_WEBHOOKS, buildStockAlertEmbed, buildPriceChangeEmbed, buildScoreDropEmbed, buildWeeklyReportEmbed } from '@/lib/discord';


export const dynamic = 'force-dynamic';
const TEST_DATE = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });

export async function GET() {
  const results: Record<string, { ok: boolean; status?: number; error?: string }> = {};

  // 1. #🌸꼬띠-오늘추천 — trigger real daily-recommendation
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/api/daily-recommendation`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
    });
    const data = await res.json();
    results.KKOTTI_RECOMMEND = { ok: data.sent ?? false };
  } catch (e) {
    results.KKOTTI_RECOMMEND = { ok: false, error: String(e) };
  }

  // 2. #📦재고-알림 — test embed
  results.STOCK_ALERT = await sendDiscord('STOCK_ALERT', '', [
    buildStockAlertEmbed({
      products: [{
        name: '[테스트] 순면 코튼 이불세트 사계절',
        sku: 'DMM-GSE2-TEST001',
        salePrice: 49000,
        honeyScore: 78,
        honeyGrade: 'A',
        netMarginRate: 42.3,
        alternatives: [
          { alt_product_name: '대체상품 A (코튼 홑이불)', platform_code: 'DMM', platform_url: 'https://domemedb.com/sample' },
        ],
      }],
    })
  ]);

  // 3. #💰가격-변동 — test embed
  results.PRICE_CHANGE = await sendDiscord('PRICE_CHANGE', '', [
    buildPriceChangeEmbed({
      changes: [{
        productName: '[테스트] 순면 코튼 이불세트',
        sku: 'DMM-GSE2-TEST001',
        oldPrice: 18000,
        newPrice: 21000,
        changePct: 16.7,
        oldMargin: 42.3,
        newMargin: 34.1,
      }],
    })
  ]);

  // 4. #📉꼬띠-점수급락 — test embed
  results.KKOTTI_SCORE = await sendDiscord('KKOTTI_SCORE', '', [
    buildScoreDropEmbed({
      drops: [{
        productName: '[테스트] 순면 코튼 이불세트',
        sku: 'DMM-GSE2-TEST001',
        oldScore: 82,
        newScore: 58,
        dropAmt: 24,
        reason: '공급가 상승 → 수익성 82→58점',
      }],
    })
  ]);

  // 5. #📊운영-리포트 — test embed
  results.OPS_REPORT = await sendDiscord('OPS_REPORT', '', [
    buildWeeklyReportEmbed({
      weekLabel: `${TEST_DATE} (테스트)`,
      totalProducts: 47,
      activeProducts: 38,
      oosProducts: 5,
      newRegistered: 12,
      avgHoneyScore: 71,
      topProduct: { name: '순면 코튼 이불세트', score: 88 },
      noAltOosCount: 2,
      priceChanges: 3,
    })
  ]);

  const allOk = Object.values(results).every(r => r.ok);
  const summary = Object.entries(results).map(([ch, r]) => `${r.ok ? '✅' : '❌'} ${ch}`);

  return NextResponse.json({
    success: allOk,
    results,
    summary,
    webhookUrls: Object.fromEntries(
      Object.entries(DISCORD_WEBHOOKS).map(([k, v]) => [k, v ? `...${v.slice(-20)}` : 'NOT SET'])
    ),
  });
}

export const POST = GET;
