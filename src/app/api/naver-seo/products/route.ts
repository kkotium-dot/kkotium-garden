// src/app/api/naver-seo/products/route.ts
// Naver SEO products API — includes naverCategoryCode for category score

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateSeoScoreDetail } from '@/lib/seo';


export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'all';
    const search = searchParams.get('search') || '';
    // Accept comma-separated ids from the Garden Warehouse bulk float menu
    const idsParam = searchParams.get('ids') || '';
    const ids = idsParam ? idsParam.split(',').filter(Boolean) : [];

    const products = await prisma.product.findMany({
      where: ids.length > 0 ? { id: { in: ids } } : undefined,
      select: {
        id: true,
        name: true,
        sku: true,
        mainImage: true,
        images: true,
        imageCount: true,
        salePrice: true,
        supplierPrice: true,
        shippingFee: true,
        naverCategoryCode: true,
        keywords: true,
        tags: true,
        shipping_template_id: true,
        naver_title: true,
        naver_keywords: true,
        naver_description: true,
        naver_brand: true,
        naver_origin: true,
        naver_material: true,
        naver_color: true,
        naver_size: true,
        naver_care_instructions: true,
        createdAt: true,
        supplier: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const productsWithSeo = products.map(product => {
      const detail = calculateSeoScoreDetail(product as any);
      // keywords: prefer JSON array, fallback to naver_keywords string
      const kwArray: string[] = Array.isArray(product.keywords)
        ? (product.keywords as string[]).filter(Boolean)
        : (product.naver_keywords ?? '').split(',').map(k => k.trim()).filter(Boolean);
      const keywordCount = kwArray.length;
      const tagsArray: string[] = Array.isArray(product.tags)
        ? (product.tags as string[]).filter(Boolean)
        : [];

      return {
        id: product.id,
        name: product.name,
        sku: product.sku ?? '',
        mainImage: product.mainImage,
        salePrice: product.salePrice,
        supplierPrice: (product as any).supplierPrice ?? 0,
        shippingFee: (product as any).shippingFee ?? 3000,
        naverCategoryCode: product.naverCategoryCode,
        keywords: kwArray,
        tags: tagsArray,
        shippingTemplateId: (product as any).shipping_template_id ?? null,
        naver_title: product.naver_title,
        naver_keywords: product.naver_keywords,
        naver_description: product.naver_description,
        naver_brand: product.naver_brand,
        naver_origin: product.naver_origin,
        naver_material: product.naver_material,
        naver_color: product.naver_color,
        naver_size: product.naver_size,
        naver_care_instructions: product.naver_care_instructions,
        supplierName: (product as any).supplier?.name ?? null,
        seoScore: detail.total,
        seoDetail: detail,
        suggestions: detail.suggestions,
        needsImprovement: detail.total < 90,
        keywordCount,
        imageCount: product.imageCount ?? ((product.mainImage ? 1 : 0) + (product.images?.length ?? 0)),
      };
    });

    // Filter by score band
    let filtered = productsWithSeo;
    if (filter === 'perfect')     filtered = filtered.filter(p => p.seoScore >= 90);
    else if (filter === 'good')   filtered = filtered.filter(p => p.seoScore >= 75 && p.seoScore < 90);
    else if (filter === 'fair')   filtered = filtered.filter(p => p.seoScore >= 45 && p.seoScore < 75);
    else if (filter === 'poor')   filtered = filtered.filter(p => p.seoScore < 45);

    // Text search
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.naver_title ?? '').toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q)
      );
    }

    return NextResponse.json({ success: true, products: filtered, total: filtered.length });
  } catch (error) {
    console.error('[naver-seo/products GET]', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
