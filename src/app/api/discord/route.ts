// /api/discord — Discord channel diagnostics
// GET/POST: by default dry-run (checks webhook config only, sends nothing).
// Pass ?send=1 to actually send [테스트] messages to all 5 channels.
// #62 단일권위: 실발송은 sendDiscord()만 거친다(self-fetch 금지, RISKY_IDIOMS IDIOM-4).

import { NextRequest, NextResponse } from 'next/server';
import { sendDiscord, DISCORD_WEBHOOKS, buildStockAlertEmbed, buildPriceChangeEmbed, buildScoreDropEmbed, buildWeeklyReportEmbed } from '@/lib/discord';
import { kstDateLabel } from '@/lib/date/kst';

export const dynamic = 'force-dynamic';
const TEST_DATE = kstDateLabel(new Date(), { year: 'numeric', month: 'long', day: 'numeric' });

const WEBHOOK_URL_RE = /^https:\/\/discord(app)?\.com\/api\/webhooks\//;

function maskUrl(v: string) {
  return v ? `...${v.slice(-20)}` : 'NOT SET';
}

/** dry-run: 실발송 없이 웹훅 설정 여부·형식만 확인한다. */
function checkChannelConfig(): Record<string, { ok: boolean; error?: string }> {
  const results: Record<string, { ok: boolean; error?: string }> = {};
  for (const [channel, url] of Object.entries(DISCORD_WEBHOOKS)) {
    if (!url) {
      results[channel] = { ok: false, error: 'NOT SET' };
    } else if (!WEBHOOK_URL_RE.test(url)) {
      results[channel] = { ok: false, error: 'INVALID_FORMAT' };
    } else {
      results[channel] = { ok: true };
    }
  }
  return results;
}

/** ?send=1: 5채널 전부에 [테스트] 임베드/메시지를 실제로 발송한다. */
async function sendTestMessages() {
  const results: Record<string, { ok: boolean; status?: number; error?: string }> = {};

  results.KKOTTI_RECOMMEND = await sendDiscord(
    'KKOTTI_RECOMMEND',
    `[테스트] 디스코드 진단 메시지 — ${TEST_DATE} (실크론은 sourcing-daily가 소유)`
  );

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

  return results;
}

export async function GET(request: NextRequest) {
  const send = request.nextUrl.searchParams.get('send') === '1';

  const results = send ? await sendTestMessages() : checkChannelConfig();
  const allOk = Object.values(results).every(r => r.ok);
  const summary = Object.entries(results).map(([ch, r]) => `${r.ok ? '✅' : '❌'} ${ch}`);

  return NextResponse.json({
    success: allOk,
    mode: send ? 'send' : 'dry-run',
    results,
    summary,
    webhookUrls: Object.fromEntries(
      Object.entries(DISCORD_WEBHOOKS).map(([k, v]) => [k, maskUrl(v)])
    ),
  });
}

export const POST = GET;
