// POST /api/naver/excel
// Generates a Naver SmartStore bulk-upload Excel file using ExcelJS.
// Uses Prisma singleton (not Supabase client) to avoid schema permission issues.
//
// 2026-06-02 Phase P0-excel-gaps — 5 mapping fixes per
//   docs/handoff/HANDOFF_naver_excel_mapping_gaps_2026-06-02.md
//   F1 options[] -> optionType/optionNames/optionValues/optionPrices/optionStocks
//   F2 manufacturer -> naver_manufacturer first
//   F3 productName -> naver_title first (Lane 1 SoT)
//   F4 returnFee/exchangeFee fallback from naver_refund_info/naver_exchange_info text
//   F5 notice* columns mapped from productInfo* fields
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateNaverExcelBuffer } from '@/lib/excel/naverExcelJS';
import type { NaverProductData } from '@/lib/excel/naverExcel.types';

// ── F1 option transform ──────────────────────────────────────────────────
// DB shape (per Desktop 2026-06-02 실측):
//   optionName: '형태'  (group label, single group)
//   options:    [{name, qty, addPrice}, ...]
// Naver Excel spec (2026-03-19, per src/app/products/new/page.tsx 조합형):
//   optionType:   '조합형' | '단독형' | '직접입력형'
//   optionNames:  group names joined by '\n'
//   optionValues: comma within group, '\n' between groups
//   optionPrices: comma-separated, first group only (one per first-group value)
//   optionStocks: comma-separated, first group only
type OptionEntry = { name?: string; qty?: number; addPrice?: number };
function buildOptionFields(
  optionType: string | null | undefined,
  optionName: string | null | undefined,
  options: unknown,
): Pick<NaverProductData, 'optionType' | 'optionNames' | 'optionValues' | 'optionPrices' | 'optionStocks'> {
  if (!Array.isArray(options) || options.length === 0) return {};
  const entries = (options as OptionEntry[]).filter((o) => o && typeof o.name === 'string' && o.name.trim());
  if (entries.length === 0) return {};
  const groupName = (optionName ?? '').trim();
  const values = entries.map((o) => (o.name as string).trim().replace(/,/g, '')).join(',');
  const prices = entries.map((o) => String(typeof o.addPrice === 'number' ? o.addPrice : 0)).join(',');
  const stocks = entries.map((o) => String(typeof o.qty === 'number' ? o.qty : 0)).join(',');
  // Default to '조합형' since per-option qty/addPrice are tracked. Allow DB literal override.
  const type = (optionType && ['조합형', '단독형', '직접입력형'].includes(optionType)) ? optionType : '조합형';
  return {
    optionType: type,
    optionNames: groupName,
    optionValues: values,
    optionPrices: prices,
    optionStocks: stocks,
  };
}

// ── F4 numeric fee extraction from free-text naver_refund_info / naver_exchange_info ──
// Heuristic: pick the first 3~6 digit number after stripping commas/spaces.
function extractFeeKrw(text: string | null | undefined): number | undefined {
  if (!text || typeof text !== 'string') return undefined;
  const cleaned = text.replace(/[,\s]/g, '');
  const m = cleaned.match(/(\d{3,6})/);
  return m ? Number(m[1]) : undefined;
}


export const dynamic = 'force-dynamic';
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const productIds: string[] = body.productIds;
    const directProducts: NaverProductData[] | undefined = body.products;

    // Direct products array path (no DB lookup needed)
    if (directProducts && directProducts.length > 0) {
      const buffer = await generateNaverExcelBuffer({ products: directProducts });
      const filename = `naver_products_${Date.now()}.xlsx`;
      return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    if (!productIds || productIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'productIds are required' },
        { status: 400 }
      );
    }

    // Fetch via Prisma singleton — avoids Supabase RLS / schema permission issues
    const rows = await prisma.product.findMany({
      where: { id: { in: productIds } },
      include: {
        supplier: { select: { name: true } },
        shipping_templates: { select: { naverTemplateNo: true, shippingFee: true, returnFee: true, exchangeFee: true, courierCode: true, shippingType: true } },
      },
    });

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No products found for given IDs' },
        { status: 404 }
      );
    }

    // Map Prisma Product rows to NaverProductData
    const products: NaverProductData[] = rows.map((p: any) => ({
      sellerProductCode:    p.sellerCode ?? p.sku ?? '',
      categoryId:           p.naverCategoryCode ?? '',
      // F3: naver_title is the Lane 1 SoT (intent-weighted, length-filled).
      // seoTitle/aiGeneratedTitle/name as fallback chain. DEBT-01 4-column
      // schema surgery deferred to P3 post-publish — short-term priority fix only.
      productName:          p.naver_title ?? p.seoTitle ?? p.aiGeneratedTitle ?? p.name ?? '',
      productStatus:        p.productStatus ?? undefined,
      price:                Number(p.salePrice) || 0,
      // Naver requires '과세상품' / '면세상품' / '영세율' not just '과세'
      taxType: (() => {
        const t = p.taxType ?? '과세';
        if (t === '과세' || t === '과세상품') return '과세상품';
        if (t === '면세' || t === '면세상품') return '면세상품';
        if (t === '영세' || t === '영세율')  return '영세율';
        return t;
      })(),
      stock:                Number(p.stock) || 999,
      // F1: options[] -> 5 option fields (조합형 default). DB→Naver transform.
      ...buildOptionFields(p.optionType, p.optionName, p.options),
      mainImage:            p.mainImage ?? '',
      additionalImages:     Array.isArray(p.additionalImages)
        ? p.additionalImages.join('\n')
        : (p.additionalImages ?? undefined),
      // description = HTML img tag pointing to detail page image
      // Naver accepts: <img src="URL"> or full HTML. Never plain text.
      description: (() => {
        const detailUrl = p.detail_image_url ?? p.aiGeneratedDesc ?? p.description ?? '';
        if (!detailUrl) return '';  // empty is better than wrong text
        // If it already looks like HTML, use as-is
        if (detailUrl.startsWith('<')) return detailUrl;
        // If it's a URL, wrap in img tag
        if (detailUrl.startsWith('http')) return `<img src="${detailUrl}">`;
        return detailUrl;
      })(),
      brand:                p.brand ?? undefined,
      // F2: naver_manufacturer first (seller-curated). Falls back to crawled.
      manufacturer:         p.naver_manufacturer ?? p.manufacturer ?? undefined,
      originCode:           p.originCode ?? undefined,
      deliveryTemplateCode: p.shipping_templates?.naverTemplateNo ?? p.deliveryTemplateCode ?? undefined,
      // F4: return/exchange fees — template first, then per-product, then
      // parsed from free-text naver_refund_info / naver_exchange_info as
      // last-resort fallback (e.g. text contains "7500").
      returnFee:   p.shipping_templates?.returnFee
        ?? p.returnShippingFee
        ?? extractFeeKrw(p.naver_refund_info)
        ?? undefined,
      exchangeFee: p.shipping_templates?.exchangeFee
        ?? p.exchangeShippingFee
        ?? extractFeeKrw(p.naver_exchange_info)
        ?? undefined,
      courierCode: p.shipping_templates?.courierCode ?? p.courierCode          ?? undefined,
      basicDeliveryFee: p.shipping_templates?.shippingFee ?? p.shippingFee     ?? undefined,
      // F5: 정보고시 individual cells from productInfo* (Desktop 후 충진 예정).
      // Template code (col 51) still primary; these are companion cells [52~55].
      noticeBrandName:     p.productInfoName     ?? p.naver_brand        ?? undefined,
      noticeModelName:     p.productInfoModel    ?? undefined,
      noticeManufacturer:  p.productInfoManufacturer ?? p.naver_manufacturer ?? undefined,
      asPhone:              p.asPhone ?? undefined,
      asGuide:              p.asInfo ?? undefined,
    }));

    const buffer = await generateNaverExcelBuffer({ products });
    const filename = `naver_products_${Date.now()}.xlsx`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.byteLength.toString(),
      },
    });
  } catch (error: any) {
    console.error('[api/naver/excel] error:', error);
    return NextResponse.json(
      { success: false, error: error.message ?? 'Excel generation failed' },
      { status: 500 }
    );
  }
}
