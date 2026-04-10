// src/app/api/products/clone/route.ts
// Clone a product for reactivation: copy all fields, append -R{n} suffix to SKU, set DRAFT
// After clone, frontend redirects to /naver-seo?ids={newId} for AI refresh

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';


export const dynamic = 'force-dynamic';
export async function POST(request: NextRequest) {
  try {
    const { productId } = await request.json();
    if (!productId) {
      return NextResponse.json({ success: false, error: 'productId required' }, { status: 400 });
    }

    const source = await prisma.product.findUnique({ where: { id: productId } });
    if (!source) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
    }

    // Find next revision suffix: -R1, -R2, -R3 ...
    const baseSku = source.sku.replace(/-R\d+$/, '');
    const existing = await prisma.product.findMany({
      where: { sku: { startsWith: baseSku + '-R' } },
      select: { sku: true },
    });
    const revision = existing.length + 1;
    const newSku = `${baseSku}-R${revision}`;

    // Ensure new SKU is unique (safety check)
    const conflict = await prisma.product.findUnique({ where: { sku: newSku } });
    if (conflict) {
      return NextResponse.json({ success: false, error: `SKU ${newSku} already exists` }, { status: 409 });
    }

    // Clone: strip unique identifiers, mark as DRAFT, clear Naver product ID
    const cloned = await prisma.product.create({
      data: {
        // Copy all base fields
        name: source.name,
        category: source.category ?? 'uncategorized',
        naverCategoryCode: source.naverCategoryCode ?? '50003307',
        salePrice: source.salePrice,
        supplierPrice: source.supplierPrice,
        margin: source.margin,
        brand: source.brand,
        manufacturer: source.manufacturer,
        originCode: source.originCode,
        shippingFee: source.shippingFee,
        shippingMethod: source.shippingMethod,
        shippingPayType: source.shippingPayType,
        shippingStrategy: source.shippingStrategy,
        shippingType: source.shippingType,
        returnShippingFee: source.returnShippingFee,
        supplierReturnFee: source.supplierReturnFee,
        supplierShippingFee: source.supplierShippingFee,
        exchangeShippingFee: source.exchangeShippingFee,
        freeShippingMinPrice: source.freeShippingMinPrice,
        mainImage: source.mainImage,
        images: source.images,
        imageAltTexts: source.imageAltTexts,
        imageCount: source.imageCount,
        hasOptions: source.hasOptions,
        optionName: source.optionName,
        optionType: source.optionType,
        optionValues: source.optionValues ?? undefined,
        options: source.options ?? undefined,
        keywords: source.keywords ?? undefined,
        tags: source.tags ?? undefined,
        taxType: source.taxType,
        asInfo: source.asInfo,
        asPhone: source.asPhone,
        courierCode: source.courierCode,
        minorPurchase: source.minorPurchase,
        supplierId: source.supplierId,
        userId: source.userId,
        shipping_template_id: source.shipping_template_id,
        importer_name: source.importer_name,
        // New identity
        sku: newSku,
        status: 'DRAFT',
        naverProductId: null,
        sellerProductCode: null,
        seller_product_code: null,
        aiScore: 0,
        salesCount: 0,
        lastSaleDate: null,
        // Clear SEO fields — will be refreshed by AI in 검색 조련사
        naver_title: null,
        naver_keywords: null,
        naver_description: null,
        naver_brand: source.naver_brand,
        naver_origin: source.naver_origin,
        naver_material: source.naver_material,
        naver_color: source.naver_color,
        naver_size: source.naver_size,
        seo_title: null,
        seo_description: null,
        seo_keywords: null,
        internalNote: `Cloned from ${source.sku} on ${new Date().toISOString().slice(0, 10)}`,
      },
    });

    // Mark original as HIDDEN
    await prisma.product.update({
      where: { id: productId },
      data: { status: 'HIDDEN' },
    });

    return NextResponse.json({
      success: true,
      clonedId: cloned.id,
      clonedSku: cloned.sku,
      originalId: productId,
      originalStatus: 'HIDDEN',
    });
  } catch (error: any) {
    console.error('[api/products/clone POST]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
