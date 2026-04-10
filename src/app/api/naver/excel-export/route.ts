// POST /api/naver/excel-export  — multi-mode Naver Excel export (ExcelJS)
// GET  /api/naver/excel-export?mode=template — empty template download
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma'; // use Prisma singleton — avoids Supabase RLS
import { generateNaverExcelBuffer, buildNaverWorkbook } from '@/lib/excel/naverExcelJS';
import type { NaverProductData, ExcelGenerateOptions } from '@/lib/excel/naverExcel.types';

// Helper: map Supabase row to NaverProductData

export const dynamic = 'force-dynamic';
function toNaverProduct(p: any): NaverProductData {
  return {
    sellerProductCode: p.sellerCode ?? p.sku ?? '',
    categoryId:        p.naverCategoryCode ?? '',
    productName:       p.seoTitle ?? p.aiGeneratedTitle ?? p.name ?? '',
    productStatus:     p.productStatus ?? undefined,
    price:             Number(p.salePrice) || 0,
    taxType:           p.taxType ?? undefined,
    stock:             Number(p.stock) || 999,
    mainImage:         p.mainImage ?? '',
    additionalImages:  p.additionalImages
      ? (() => { try { return JSON.parse(p.additionalImages).join('\n'); } catch { return p.additionalImages; } })()
      : undefined,
    description:       p.aiGeneratedDesc ?? p.description ?? p.name ?? '',
    brand:             p.brand ?? undefined,
    manufacturer:      p.manufacturer ?? undefined,
    originCode:        p.originCode ?? undefined,
    deliveryTemplateCode: p.deliveryTemplateCode ?? undefined,
    asPhone:           p.asPhone ?? undefined,
    asGuide:           p.asInfo ?? undefined,
  };
}

function excelResponse(buffer: Buffer, filename: string) {
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
      'Content-Length': buffer.byteLength.toString(),
    },
  });
}

interface ExportRequest {
  mode: 'single' | 'batch' | 'filter' | 'template';
  productId?: string;
  productIds?: string[];
  shippingTemplateCode?: string;
  filters?: {
    status?: string;
    minScore?: number;
    supplierId?: string;
    categoryCode?: string;
    dateFrom?: string;
    dateTo?: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: ExportRequest = await request.json();
    let buffer: Buffer;
    let filename: string;

    switch (body.mode) {
      case 'single': {
        if (!body.productId) return NextResponse.json({ success: false, error: 'productId required' }, { status: 400 });
        const product = await prisma.product.findUnique({ where: { id: body.productId } });
        if (!product) return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
        buffer = await generateNaverExcelBuffer({
          products: [toNaverProduct(product)],
          shippingTemplate: body.shippingTemplateCode ? { templateCode: body.shippingTemplateCode } : undefined,
        });
        filename = `naver_product_${body.productId}_${Date.now()}.xlsx`;
        break;
      }

      case 'batch': {
        if (!body.productIds?.length) return NextResponse.json({ success: false, error: 'productIds required' }, { status: 400 });
        const products = await prisma.product.findMany({ where: { id: { in: body.productIds } } });
        if (!products.length) return NextResponse.json({ success: false, error: 'No products found' }, { status: 404 });
        buffer = await generateNaverExcelBuffer({
          products: products.map(toNaverProduct),
          shippingTemplate: body.shippingTemplateCode ? { templateCode: body.shippingTemplateCode } : undefined,
        });
        filename = `naver_products_${products.length}개_${Date.now()}.xlsx`;
        break;
      }

      case 'filter': {
        // filters is optional — no filters = export all products
        const f = body.filters ?? {};
        const where: any = {};
        if (f.status)       where.status            = f.status;
        if (f.supplierId)   where.supplierId        = f.supplierId;
        if (f.categoryCode) where.naverCategoryCode = f.categoryCode;
        if (f.dateFrom || f.dateTo) {
          where.createdAt = {};
          if (f.dateFrom) where.createdAt.gte = new Date(f.dateFrom);
          if (f.dateTo)   where.createdAt.lte = new Date(f.dateTo);
        }
        const products = await prisma.product.findMany({ where, take: 500 });
        if (products.length === 0) return NextResponse.json({ success: false, error: '조건에 맞는 상품이 없습니다' }, { status: 404 });
        buffer = await generateNaverExcelBuffer({ products: products.map(toNaverProduct) });
        filename = `naver_products_${products.length}개_${Date.now()}.xlsx`;
        break;
      }

      case 'template': {
        // Empty template: generate with zero data rows
        buffer = await generateNaverExcelBuffer({ products: [], includeGuideRow: true });
        filename = `naver_template_${Date.now()}.xlsx`;
        break;
      }

      default:
        return NextResponse.json({ success: false, error: 'Invalid mode' }, { status: 400 });
    }

    return excelResponse(buffer, filename);
  } catch (error) {
    console.error('[api/naver/excel-export] POST error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const mode = new URL(request.url).searchParams.get('mode');
    if (mode !== 'template') {
      return NextResponse.json({ success: false, error: 'GET supports mode=template only' }, { status: 400 });
    }
    const buffer = await generateNaverExcelBuffer({ products: [], includeGuideRow: true });
    return excelResponse(buffer, `naver_template_${Date.now()}.xlsx`);
  } catch (error) {
    console.error('[api/naver/excel-export] GET error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
