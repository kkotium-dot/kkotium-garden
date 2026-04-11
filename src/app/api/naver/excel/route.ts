// POST /api/naver/excel
// Generates a Naver SmartStore bulk-upload Excel file using ExcelJS.
// Uses Prisma singleton (not Supabase client) to avoid schema permission issues.
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateNaverExcelBuffer } from '@/lib/excel/naverExcelJS';
import type { NaverProductData } from '@/lib/excel/naverExcel.types';


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
      productName:          p.seoTitle ?? p.aiGeneratedTitle ?? p.naver_title ?? p.name ?? '',
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
      manufacturer:         p.manufacturer ?? undefined,
      originCode:           p.originCode ?? undefined,
      deliveryTemplateCode: p.shipping_templates?.naverTemplateNo ?? p.deliveryTemplateCode ?? undefined,
      // Fallback shipping fields from linked template when no naverTemplateNo
      returnFee:   p.shipping_templates?.returnFee  ?? p.returnShippingFee   ?? undefined,
      exchangeFee: p.shipping_templates?.exchangeFee ?? p.exchangeShippingFee ?? undefined,
      courierCode: p.shipping_templates?.courierCode ?? p.courierCode          ?? undefined,
      basicDeliveryFee: p.shipping_templates?.shippingFee ?? p.shippingFee     ?? undefined,
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
