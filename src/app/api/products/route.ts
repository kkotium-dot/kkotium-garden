// src/app/api/products/route.ts
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 상품 목록 API (Status 대소문자 통일 + aiScore null 처리)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { calcHoneyScore } from '@/lib/honey-score';
import { sendDiscord, buildScoreDropEmbed } from '@/lib/discord';
import { prisma } from '@/lib/prisma';

// Fire-and-forget: check honey score drop after product update

export const dynamic = 'force-dynamic';
async function checkScoreDrop(productId: string, previousScore: number | null) {
  try {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true, name: true, sku: true,
        salePrice: true, supplierPrice: true,
        naverCategoryCode: true, mainImage: true,
        keywords: true, tags: true, aiScore: true,
      },
    });
    if (!product) return;

    const currentScore = calcHoneyScore({
      salePrice:     product.salePrice,
      supplierPrice: product.supplierPrice ?? 0,
      categoryId:    product.naverCategoryCode ?? '',
      productName:   product.name,
      keywords:      Array.isArray(product.keywords) ? product.keywords as string[] : [],
      tags:          Array.isArray(product.tags) ? product.tags as string[] : [],
      hasMainImage:  !!product.mainImage,
    }).total;

    // Update stored score
    await prisma.product.update({ where: { id: productId }, data: { aiScore: currentScore } }).catch(() => null);

    const DROP_THRESHOLD = 20;
    if (previousScore !== null && (previousScore - currentScore) >= DROP_THRESHOLD) {
      await sendDiscord('KKOTTI_SCORE', '', [
        buildScoreDropEmbed({
          drops: [{
            productName: product.name,
            sku: product.sku,
            oldScore: previousScore,
            newScore: currentScore,
            dropAmt: previousScore - currentScore,
            reason: `수정 후 점수 ${previousScore}→${currentScore}점`,
          }],
        })
      ]);
    }
  } catch {
    // Non-critical — silent fail
  }
}

// GET: 상품 목록 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const status = searchParams.get('status');
    const minScore = searchParams.get('minScore');
    const maxScore = searchParams.get('maxScore');
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    const where: any = {};

    // ⭐ Status 필터 (대문자로 정규화!)
    if (status) {
      where.status = status.toUpperCase();
    }

    // ⭐ AI 점수 필터 (null 처리!)
    if (minScore || maxScore) {
      where.aiScore = {};
      if (minScore) {
        where.aiScore.gte = parseInt(minScore);
      }
      if (maxScore) {
        where.aiScore.lte = parseInt(maxScore);
      }
    }

    // 검색 필터
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
      ];
    }

    // 정렬
    const orderBy: any = {};
    if (sortBy === 'aiScore') {
      orderBy.aiScore = sortOrder === 'asc' ? 'asc' : 'desc';
    } else {
      orderBy[sortBy] = sortOrder === 'asc' ? 'asc' : 'desc';
    }

    const products = await prisma.product.findMany({
      where,
      orderBy,
      select: {
        id: true,
        name: true,
        sku: true,
        category: true,
        salePrice: true,
        supplierPrice: true,
        margin: true,
        images: true,
        mainImage: true,
        status: true,
        aiScore: true,
        naver_title: true,
        naver_keywords: true,
        naver_description: true,
        naver_brand: true,
        naver_material: true,
        naver_color: true,
        naver_size: true,
        createdAt: true,
        updatedAt: true,
        naverCategoryCode: true,
        naverProductId: true,
        shippingFee: true,
        shipping_fee_type: true,
        shipping_template_id: true,
        keywords: true,
        tags: true,
        supplier: {
          select: {
            id: true,
            name: true,
            platformCode: true,
          }
        },
        shipping_templates: {
          select: {
            id: true,
            name: true,
            shippingType: true,
            shippingFee: true,
            freeThreshold: true,
            naverTemplateNo: true,
          }
        },
      },
    });

    // Normalize aiScore null to 0, flatten relations
    const normalizedProducts = products.map(p => {
      const { supplier, shipping_templates, ...rest } = p as any;
      return {
        ...rest,
        aiScore: rest.aiScore ?? 0,
        supplierName: supplier?.name ?? null,
        supplierId: supplier?.id ?? null,
        platformName: supplier?.platformCode ?? null,
        shippingTemplateName: shipping_templates?.name ?? null,
        shippingTemplateId: shipping_templates?.id ?? null,
        shippingType: shipping_templates?.shippingType ?? null,
        naverTemplateNo: shipping_templates?.naverTemplateNo ?? null,
      };
    });

    return NextResponse.json({
      success: true,
      products: normalizedProducts,
      total: normalizedProducts.length,
    });

  } catch (error: any) {
    console.error('상품 목록 조회 오류:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST: 신규 상품 등록
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    const normalizedStatus = (data.status ?? 'DRAFT').toUpperCase();

    // Resolve supplierId: fallback to first supplier in DB
    let supplierId: string = data.supplierId || '';
    if (!supplierId) {
      const defaultSupplier = await prisma.supplier.findFirst();
      supplierId = defaultSupplier?.id ?? '';
    }

    // Resolve userId: fallback to first user in DB
    let userId: string = data.userId || '';
    if (!userId) {
      const defaultUser = await prisma.user.findFirst();
      userId = defaultUser?.id ?? '';
    }

    if (!supplierId || !userId) {
      return NextResponse.json(
        { success: false, error: 'Supplier or User not found. Please seed the DB first.' },
        { status: 400 }
      );
    }

    const salePrice = Math.round(parseFloat(String(data.salePrice)) || 0);
    const supplierPrice = Math.round(parseFloat(String(data.supplierPrice)) || 0);
    const margin =
      salePrice > 0
        ? parseFloat(((salePrice - supplierPrice) / salePrice * 100).toFixed(2))
        : 0;

    const product = await prisma.product.create({
      data: {
        name: String(data.name || ''),
        sku: String(data.sku || ''),
        category: String(data.category || 'uncategorized'),
        naverCategoryCode: String(data.naverCategoryCode || '50003307'),
        salePrice,
        supplierPrice,
        margin,
        status: normalizedStatus,
        brand: String(data.brand || '꽃틔움'),
        manufacturer: String(data.manufacturer || '도매매 공급사'),
        originCode: String(data.originCode || '0200037'),
        shippingFee: Math.round(parseFloat(String(data.shippingFee)) || 3000),
        images: Array.isArray(data.images) ? data.images : [],
        imageAltTexts: Array.isArray(data.imageAltTexts) ? data.imageAltTexts : [],
        mainImage: data.mainImage ? String(data.mainImage) : null,
        aiScore: data.aiScore ?? 0,
        naver_title: data.naver_title ? String(data.naver_title) : null,
        naver_description: data.naver_description ? String(data.naver_description) : null,
        naver_brand: data.naver_brand ? String(data.naver_brand) : null,
        naver_manufacturer: data.naver_manufacturer ? String(data.naver_manufacturer) : null,
        naver_origin: data.naver_origin ? String(data.naver_origin) : null,
        naver_keywords: data.naver_keywords ? String(data.naver_keywords) : null,
        seller_product_code: data.seller_product_code ? String(data.seller_product_code) : null,
        supplier_product_code: data.supplier_product_code ? String(data.supplier_product_code) : null,
        instant_discount: data.instant_discount != null ? data.instant_discount : null,
        importer_name: data.importer_name ? String(data.importer_name) : null,
        supplierId,
        userId,
      },
    });

    return NextResponse.json({ success: true, product });

  } catch (error: any) {
    console.error('상품 등록 오류:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PUT: 상품 수정
export async function PUT(request: NextRequest) {
  try {
    const data = await request.json();
    const { id, ...updateData } = data;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Product ID required' },
        { status: 400 }
      );
    }

    // ⭐ Status 대문자로 정규화
    if (updateData.status) {
      updateData.status = updateData.status.toUpperCase();
    }

    // ⭐ aiScore null 방지
    if (updateData.aiScore === null || updateData.aiScore === undefined) {
      updateData.aiScore = 0;
    }

    // Capture previous score BEFORE update for drop detection
    const prevData = await prisma.product.findUnique({ where: { id }, select: { aiScore: true } });
    const previousScore = prevData?.aiScore ?? null;

    const product = await prisma.product.update({
      where: { id },
      data: {
        ...updateData,
        salePrice: parseFloat(updateData.salePrice) || 0,
        supplierPrice: parseFloat(updateData.supplierPrice) || 0,
        stock: parseInt(updateData.stock) || 0,
        shippingFee: parseFloat(updateData.shippingFee) || 0,
      },
    });

    // Fire-and-forget score drop check
    checkScoreDrop(id, previousScore).catch(() => null);

    return NextResponse.json({
      success: true,
      product,
    });

  } catch (error: any) {
    console.error('상품 수정 오류:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE: 상품 삭제
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Product ID required' },
        { status: 400 }
      );
    }

    await prisma.product.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Product deleted',
    });

  } catch (error: any) {
    console.error('상품 삭제 오류:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
