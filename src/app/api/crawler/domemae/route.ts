import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { domemaeAdapter, extractProductNo } from '@/lib/sources/domemae-adapter';
import { SourceAdapterError } from '@/lib/sources/source-adapter';

// Domeggook OpenAPI-based crawler.
// Replaces HTML scraping with the official API: https://domeggook.com/ssl/api/
// Docs: https://docs.channel.io/domeggook_api/ko
// Rate limit: 180/min, 15,000/day.
//
// As of Sprint 6.5 the parsing/networking logic now lives in
// src/lib/sources/domemae-adapter.ts. This route is a thin HTTP wrapper
// that preserves the existing external contract (request body { url } and
// response shape) so callers (/crawl page, AlternativeProductPanel,
// DomemaeCrawler component) need no changes.

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { url } = await request.json();
    if (!url?.trim()) {
      return NextResponse.json(
        { success: false, error: 'URL \uB610\uB294 \uC0C1\uD488\uBC88\uD638\uB97C \uC785\uB825\uD574\uC8FC\uC138\uC694' },
        { status: 400 },
      );
    }

    const isValidDomemae =
      url.includes('domeggook.com') || /^\d{6,10}$/.test(url.trim());
    if (!isValidDomemae) {
      return NextResponse.json(
        {
          success: false,
          error:
            '\uB3C4\uB9E4\uB9E4(domeggook.com) URL \uB610\uB294 \uC0C1\uD488\uBC88\uD638\uB9CC \uC9C0\uC6D0\uD569\uB2C8\uB2E4',
        },
        { status: 400 },
      );
    }

    const productNo = extractProductNo(url);
    if (!productNo) {
      return NextResponse.json(
        { success: false, error: '\uC0C1\uD488\uBC88\uD638\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4' },
        { status: 400 },
      );
    }

    // Delegate the heavy lifting to the adapter
    let detail;
    try {
      detail = await domemaeAdapter.getItemDetail(productNo);
    } catch (e) {
      if (e instanceof SourceAdapterError) {
        // Map adapter errors to user-facing messages, preserving previous behavior
        if (e.kind === 'AuthFailed') {
          return NextResponse.json(
            {
              success: false,
              error:
                '\uB3C4\uB9E4\uAFB9 API Key\uAC00 \uC124\uC815\uB418\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4. \uB124\uC774\uBC84 \uAE30\uBCF8\uAC12 \uC124\uC815\uC5D0\uC11C API Key\uB97C \uC785\uB825\uD574\uC8FC\uC138\uC694.',
            },
            { status: 400 },
          );
        }
        if (e.kind === 'BadResponse') {
          console.error('[crawler-api] adapter bad response:', e.message);
          return NextResponse.json(
            { success: false, error: `\uB3C4\uB9E4\uAFB9 API \uC624\uB958: ${e.message}` },
            { status: 400 },
          );
        }
        throw e; // unhandled adapter error -> outer catch
      }
      throw e;
    }

    if (!detail) {
      return NextResponse.json(
        { success: false, error: '\uC0C1\uD488\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4' },
        { status: 404 },
      );
    }

    console.log(
      `[crawler-api] no=${detail.productNo} | "${detail.name}" | ` +
        `supply=${detail.supplierPrice} | opts=${detail.options.length} | ` +
        `seller=${detail.sellerId}(${detail.sellerNick}) | stock=${detail.inventory}`,
    );

    // Persist sourcing snapshot (preserve original behavior including non-blocking insert)
    prisma.$executeRaw`
      INSERT INTO crawl_logs (
        id, url, name, supplier_price, images, options, status, source,
        seller_nick, seller_id, seller_rank, category_name, category_code,
        inventory, ship_fee, can_merge, sourcing_status
      ) VALUES (
        gen_random_uuid(),
        ${detail.sourceUrl},
        ${detail.name}, ${detail.supplierPrice},
        ${JSON.stringify(detail.images)}::jsonb,
        ${JSON.stringify(detail.options)}::jsonb,
        'success', 'single',
        ${detail.sellerNick}, ${detail.sellerId}, ${Number(detail.sellerRank)},
        ${detail.categoryName}, ${detail.categoryCode},
        ${Number(detail.inventory)}, ${Number(detail.shipFee)}, ${Boolean(detail.canMerge)},
        'SOURCED'
      )
    `.catch((e) => console.error('[crawl-log-insert]', e));

    return NextResponse.json({
      success: true,
      data: {
        // Match the original response shape verbatim
        name: detail.name || '\uC0C1\uD488\uBA85\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4',
        supplierPrice: detail.supplierPrice,
        images: detail.images,
        options: detail.options,
        description: detail.description,
        sourceUrl: detail.sourceUrl,
        productNo: detail.productNo,
        inventory: detail.inventory,
        shipFee: detail.shipFee,
        canMerge: detail.canMerge,
        sellerNick: detail.sellerNick,
        sellerId: detail.sellerId,
        sellerRank: detail.sellerRank,
        categoryName: detail.categoryName,
        categoryCode: detail.categoryCode,
        country: detail.country,
        status: detail.status,
        isOnSupply: detail.isOnSupply,
      },
      sessionAgeDays: 0,
      sessionWarning: null,
    });
  } catch (error: unknown) {
    console.error('[crawler-api] error:', error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : '\uD06C\uB864\uB9C1 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4',
      },
      { status: 500 },
    );
  }
}
