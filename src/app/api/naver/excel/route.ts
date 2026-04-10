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
      include: { supplier: { select: { name: true } } },
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
      taxType:              p.taxType ?? undefined,
      stock:                Number(p.stock) || 999,
      mainImage:            p.mainImage ?? '',
      additionalImages:     Array.isArray(p.additionalImages)
        ? p.additionalImages.join('\n')
        : (p.additionalImages ?? undefined),
      description:          p.aiGeneratedDesc ?? p.description ?? p.name ?? '',
      brand:                p.brand ?? undefined,
      manufacturer:         p.manufacturer ?? undefined,
      originCode:           p.originCode ?? undefined,
      deliveryTemplateCode: p.deliveryTemplateCode ?? undefined,
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
