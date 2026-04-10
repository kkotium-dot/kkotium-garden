// /api/crawler/stock-check
// Checks real supplier site inventory for registered products
// Called by Vercel Cron via stock-monitor, or manually from UI
// Supports domemae (domemedb.com) and domeggook (domeggook.com)

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as iconv from 'iconv-lite';
import * as cheerio from 'cheerio';
import { sendDiscord, buildStockAlertEmbed, buildPriceChangeEmbed } from '@/lib/discord';
import { calcHoneyScore } from '@/lib/honey-score';

// ── OOS detection patterns (Korean supplier sites) ──────────────────────────

export const dynamic = 'force-dynamic';
const OOS_PATTERNS = [
  /품절/,
  /sold.?out/i,
  /재고\s*없/,
  /out.?of.?stock/i,
  /매진/,
  /판매\s*종료/,
  /구매\s*불가/,
];

// Price extraction from supplier page HTML
function extractPrice(html: string): number | null {
  const $ = cheerio.load(html);

  const priceSelectors = [
    '#supply_price', '#sale_price', '#sell_price',
    '.supply_price', '.sale_price', '.sell_price',
    '[id*="price"]', '[class*="supply"]',
  ];

  for (const sel of priceSelectors) {
    const text = $(sel).first().text().replace(/[^0-9]/g, '');
    const num = parseInt(text);
    if (!isNaN(num) && num >= 100 && num < 100_000_000) return num;
  }

  // Pattern match fallback
  const bodyText = $('body').text();
  const patterns = [
    /공급가[:\s]*([0-9,]+)원/,
    /도매가[:\s]*([0-9,]+)원/,
    /판매가[:\s]*([0-9,]+)원/,
  ];
  for (const p of patterns) {
    const m = bodyText.match(p);
    if (m) {
      const num = parseInt(m[1].replace(/,/g, ''));
      if (!isNaN(num) && num >= 100) return num;
    }
  }
  return null;
}

// Fetch and decode supplier page (EUC-KR support)
async function fetchSupplierPage(url: string): Promise<{ html: string; ok: boolean }> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept-Language': 'ko-KR,ko;q=0.9',
      },
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return { html: '', ok: false };
    const buf = Buffer.from(await res.arrayBuffer());
    let html: string;
    try { html = iconv.decode(buf, 'euc-kr'); }
    catch { html = iconv.decode(buf, 'utf-8'); }
    return { html, ok: true };
  } catch {
    return { html: '', ok: false };
  }
}

export interface StockCheckResult {
  productId: string;
  productName: string;
  sku: string;
  url: string;
  previousStatus: string;
  newStatus: 'in_stock' | 'out_of_stock' | 'unknown';
  previousPrice: number;
  detectedPrice: number | null;
  priceChanged: boolean;
  changePct: number;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const limit = body.limit ?? 30;  // max products to check per run
    const dryRun = body.dryRun ?? false;  // if true, don't update DB

    // Get active products with supplier URLs (from product_alternatives or supplier platformUrl)
    const productsWithUrls = await prisma.$queryRaw<{
      id: string;
      name: string;
      sku: string;
      status: string;
      sale_price: number;
      supplier_price: number;
      naver_cat: string;
      supplier_url: string;
      alt_id: string | null;
    }[]>`
      SELECT DISTINCT ON (p.id)
        p.id, p.name, p.sku, p.status,
        p."salePrice" as sale_price,
        COALESCE(p."supplierPrice", 0) as supplier_price,
        COALESCE(p."naverCategoryCode", '') as naver_cat,
        COALESCE(pa.platform_url, s."platformUrl", '') as supplier_url,
        pa.id as alt_id
      FROM "Product" p
      LEFT JOIN product_alternatives pa
        ON pa.product_id = p.id AND pa.is_active = true AND pa.platform_url IS NOT NULL
      LEFT JOIN "Supplier" s ON s.id = p."supplierId"
      WHERE p.status NOT IN ('INACTIVE')
        AND (
          (pa.platform_url IS NOT NULL AND pa.platform_url != '')
          OR (s."platformUrl" IS NOT NULL AND s."platformUrl" != '')
        )
      ORDER BY p.id, pa.priority ASC NULLS LAST
      LIMIT ${limit}
    `;

    if (productsWithUrls.length === 0) {
      return NextResponse.json({
        success: true,
        message: '공급사 URL이 등록된 상품이 없습니다. 대체상품에 URL을 등록해주세요.',
        checked: 0,
        oosDetected: 0,
        priceChanges: 0,
      });
    }

    // Check each product in parallel (batch of 5)
    const results: StockCheckResult[] = [];
    const BATCH = 5;

    for (let i = 0; i < productsWithUrls.length; i += BATCH) {
      const batch = productsWithUrls.slice(i, i + BATCH);
      const batchResults = await Promise.all(
        batch.map(async (p) => {
          if (!p.supplier_url) {
            return {
              productId: p.id, productName: p.name, sku: p.sku,
              url: '', previousStatus: p.status,
              newStatus: 'unknown' as const,
              previousPrice: p.supplier_price, detectedPrice: null,
              priceChanged: false, changePct: 0,
            };
          }

          const { html, ok } = await fetchSupplierPage(p.supplier_url);
          if (!ok) {
            return {
              productId: p.id, productName: p.name, sku: p.sku,
              url: p.supplier_url, previousStatus: p.status,
              newStatus: 'unknown' as const,
              previousPrice: p.supplier_price, detectedPrice: null,
              priceChanged: false, changePct: 0,
            };
          }

          // OOS detection
          const isOos = OOS_PATTERNS.some(pat => pat.test(html));
          const newStatus: StockCheckResult['newStatus'] = isOos ? 'out_of_stock' : 'in_stock';

          // Price detection
          const detectedPrice = extractPrice(html);
          const prevPrice = p.supplier_price;
          const priceChanged = detectedPrice !== null && prevPrice > 0
            && Math.abs(detectedPrice - prevPrice) / prevPrice > 0.03; // >3% change
          const changePct = priceChanged && prevPrice > 0
            ? ((detectedPrice! - prevPrice) / prevPrice) * 100
            : 0;

          return {
            productId: p.id, productName: p.name, sku: p.sku,
            url: p.supplier_url, previousStatus: p.status,
            newStatus, previousPrice: prevPrice, detectedPrice,
            priceChanged, changePct,
          };
        })
      );
      results.push(...batchResults);
    }

    // Filter meaningful results
    const newlyOos    = results.filter(r => r.newStatus === 'out_of_stock' && r.previousStatus !== 'OUT_OF_STOCK');
    const nowInStock  = results.filter(r => r.newStatus === 'in_stock'    && r.previousStatus === 'OUT_OF_STOCK');
    const priceChanges = results.filter(r => r.priceChanged);

    // ── Apply DB updates ──────────────────────────────────────────────────────
    if (!dryRun) {
      // Mark new OOS products
      for (const r of newlyOos) {
        await prisma.product.update({
          where: { id: r.productId },
          data: { status: 'OUT_OF_STOCK' },
        }).catch(() => null);
      }

      // Restore in-stock products
      for (const r of nowInStock) {
        await prisma.product.update({
          where: { id: r.productId },
          data: { status: 'ACTIVE' },
        }).catch(() => null);
      }

      // Log price changes
      for (const r of priceChanges) {
        if (r.detectedPrice === null) continue;
        await prisma.$executeRaw`
          INSERT INTO supplier_price_log (product_id, old_price, new_price, change_pct, detected_at)
          VALUES (${r.productId}, ${r.previousPrice}, ${r.detectedPrice}, ${r.changePct}, NOW())
        `.catch(() => null);

        // Update product supplierPrice
        await prisma.product.update({
          where: { id: r.productId },
          data: { supplierPrice: r.detectedPrice },
        }).catch(() => null);
      }
    }

    // ── Discord notifications ─────────────────────────────────────────────────
    let stockSent = false;
    let priceSent = false;

    // #📦재고-알림
    if (newlyOos.length > 0) {
      const enriched = await Promise.all(newlyOos.map(async r => {
        const alts = await prisma.$queryRaw<any[]>`
          SELECT alt_product_name, platform_code, platform_url
          FROM product_alternatives WHERE product_id = ${r.productId} AND is_active = true
          ORDER BY priority ASC LIMIT 3
        `.catch(() => []);

        const hs = calcHoneyScore({ salePrice: 0, supplierPrice: r.previousPrice });
        return {
          name: r.productName, sku: r.sku, salePrice: 0,
          honeyScore: hs.total, honeyGrade: hs.grade, netMarginRate: hs.netMarginRate,
          alternatives: alts,
        };
      }));

      const embed = buildStockAlertEmbed({ products: enriched });
      const res = await sendDiscord('STOCK_ALERT', '', [embed]);
      stockSent = res.ok;
    }

    // Restock notification (back in stock)
    if (nowInStock.length > 0) {
      await sendDiscord('STOCK_ALERT', '', [{
        title: ':white_check_mark: 재입고 감지',
        description: `${nowInStock.map(r => `**${r.productName}**`).join(', ')} 재입고됐어요!`,
        color: 0x16a34a,
        timestamp: new Date().toISOString(),
      }]);
    }

    // #💰가격-변동
    if (priceChanges.length > 0) {
      // Need salePrice from product for margin calc — fetch from results
      const productMap = new Map(productsWithUrls.map(p => [p.id, p]));

      const embed = buildPriceChangeEmbed({
        changes: priceChanges.map(r => {
          const p = productMap.get(r.productId);
          const salePrice = p?.sale_price ?? 0;
          const naverFee = salePrice * 0.055;
          const oldMargin = p && salePrice > 0
            ? ((salePrice - r.previousPrice - naverFee - 3000) / salePrice) * 100 : 0;
          const newMargin = p && salePrice > 0 && r.detectedPrice
            ? ((salePrice - r.detectedPrice - naverFee - 3000) / salePrice) * 100 : 0;
          return {
            productName: r.productName,
            sku: r.sku,
            oldPrice: r.previousPrice,
            newPrice: r.detectedPrice!,
            changePct: r.changePct,
            oldMargin,
            newMargin,
          };
        }),
      });

      const res = await sendDiscord('PRICE_CHANGE', '', [embed]);
      priceSent = res.ok;
    }

    return NextResponse.json({
      success: true,
      dryRun,
      checked:     results.length,
      oosDetected: newlyOos.length,
      restocked:   nowInStock.length,
      priceChanges: priceChanges.length,
      stockSent,
      priceSent,
      summary: {
        newlyOos:    newlyOos.map(r => ({ name: r.productName, sku: r.sku })),
        nowInStock:  nowInStock.map(r => ({ name: r.productName, sku: r.sku })),
        priceChanges: priceChanges.map(r => ({
          name: r.productName, sku: r.sku,
          oldPrice: r.previousPrice, newPrice: r.detectedPrice, pct: r.changePct.toFixed(1),
        })),
      },
    });
  } catch (err) {
    console.error('[crawler/stock-check]', err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}

// GET for manual test from dashboard
export const GET = POST;
