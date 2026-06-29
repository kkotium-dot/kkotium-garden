// src/app/api/products/route.ts
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 상품 목록 API (Status 대소문자 통일 + aiScore null 처리)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { calcHoneyScore } from '@/lib/honey-score';
import { sendDiscord, buildScoreDropEmbed } from '@/lib/discord';
import { prisma } from '@/lib/prisma';
import { KKOTIUM_DEFAULTS } from '@/lib/naver/codes';
import { generateUniqueSku } from '@/lib/sku-engine';
import { mapCrawlOptions } from '@/lib/sources/crawl-option-mapper';
import { parseDomeProductNo } from '@/lib/sources/parse-dome-no';
import { sanitizeProductWrite } from '@/lib/product-write-fields';

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
        return_care_enabled: true,
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

    // Resolve supplierId: verify the supplied id actually exists, otherwise
    // fall back to the first supplier in DB. A non-empty but invalid id (e.g.
    // a sentinel string or a stale id) would otherwise trigger an FK violation.
    let supplierId = '';
    if (data.supplierId && data.supplierId !== 'default') {
      const exists = await prisma.supplier.findUnique({
        where: { id: String(data.supplierId) },
        select: { id: true },
      });
      if (exists) supplierId = exists.id;
    }
    if (!supplierId) {
      const defaultSupplier = await prisma.supplier.findFirst();
      supplierId = defaultSupplier?.id ?? '';
    }

    // Resolve userId: same verify-then-fallback. The register form historically
    // sent the literal "default" (not a real DB id), which is truthy and slipped
    // past the old `!userId` guard -> Product_userId_fkey violation.
    let userId = '';
    if (data.userId && data.userId !== 'default') {
      const exists = await prisma.user.findUnique({
        where: { id: String(data.userId) },
        select: { id: true },
      });
      if (exists) userId = exists.id;
    }
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

    // G7 SKU fix: the sku column is unique, and an empty string '' counts as a
    // single value -> the 2nd SKU-less product would hit a unique-constraint 500.
    // When no SKU is supplied, auto-issue a collision-safe one via the shared
    // engine instead of persisting ''.
    const rawSku = data.sku ? String(data.sku).trim() : '';
    const resolvedSku = rawSku
      ? rawSku
      : await generateUniqueSku({
          supplierId,
          supplierProductNo: String(
            data.supplier_product_code ?? data.productNo ?? '',
          ).trim(),
        });

    // Map any supplied options (single-axis crawl prefill: array of
    // { name, qty, addPrice }) onto BOTH option stores. Root-cause fix
    // (HANDOFF_crawl_option_mapping_fix_2026-06-03.md): the single-item prefill
    // path created products with no option columns AND no product_options row,
    // so option products shipped with options lost. mapCrawlOptions returns null
    // when there are no usable options ⇒ hasOptions stays false (single product
    // path unchanged). Mirrors the batch-register promotion path exactly.
    const optionAxis =
      typeof data.optionName === 'string' && data.optionName.trim()
        ? data.optionName.trim()
        : undefined;
    const mapped = Array.isArray(data.options) && data.options.length > 0
      ? mapCrawlOptions(data.options, optionAxis)
      : null;

    // Create the product + (when present) its product_options row atomically so
    // the publish gate (Product.options/optionName/hasOptions) and the register
    // payload (product_options → buildOptionInfo) never diverge.
    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          name: String(data.name || ''),
          sku: resolvedSku,
          category: String(data.category || 'uncategorized'),
          naverCategoryCode: String(data.naverCategoryCode || KKOTIUM_DEFAULTS.categoryCode),
          salePrice,
          supplierPrice,
          margin,
          status: normalizedStatus,
          brand: String(data.brand || '꽃틔움'),
          manufacturer: String(data.manufacturer || '도매매 공급사'),
          originCode: String(data.originCode || KKOTIUM_DEFAULTS.originCode),
          shippingFee: Math.round(parseFloat(String(data.shippingFee)) || 3000),
          images: Array.isArray(data.images) ? data.images : [],
          imageAltTexts: Array.isArray(data.imageAltTexts) ? data.imageAltTexts : [],
          mainImage: data.mainImage ? String(data.mainImage) : null,
          // IMAGE-SPLIT (#163) — operator-uploaded 상세페이지(상품상세정보) images.
          // jsonb array, distinct from the search-gallery thumbnails above.
          detail_images: Array.isArray(data.detail_images) ? data.detail_images : undefined,
          aiScore: data.aiScore ?? 0,
          naver_title: data.naver_title ? String(data.naver_title) : null,
          naver_description: data.naver_description ? String(data.naver_description) : null,
          naver_brand: data.naver_brand ? String(data.naver_brand) : null,
          naver_manufacturer: data.naver_manufacturer ? String(data.naver_manufacturer) : null,
          naver_origin: data.naver_origin ? String(data.naver_origin) : null,
          naver_keywords: data.naver_keywords ? String(data.naver_keywords) : null,
          seller_product_code: data.seller_product_code ? String(data.seller_product_code) : null,
          // Re-prevention (item 1): never lose supplier_product_code — fall back
          // to the crawl productNo, then parse it from any source URL the prefill
          // carries (the capture/backfill key for the full-res detail).
          supplier_product_code: (() => {
            const explicit = data.supplier_product_code ?? data.productNo;
            if (explicit) return String(explicit).trim();
            const parsed = parseDomeProductNo(
              (data.sourceUrl as string) ?? (data.url as string) ?? (data.productUrl as string) ?? null,
            );
            return parsed;
          })(),
          instant_discount: data.instant_discount != null ? data.instant_discount : null,
          importer_name: data.importer_name ? String(data.importer_name) : null,
          return_care_enabled: data.return_care_enabled === true,
          // G7 Fix C: persist fields the register form actually sends but the
          // create previously dropped (DRAFT 88-field persistence gap). These all
          // map to real Product columns; arrays/null guarded to avoid Prisma 500.
          taxType: data.taxType ? String(data.taxType) : undefined,
          // A/S fields the save form sends. asGuide is the legacy alias (a
          // StoreSettings key); on a Product the A/S guidance is asInfo. Both
          // have schema defaults, so undefined falls back to the default. (#150)
          asInfo: (data.asInfo ?? data.asGuide) != null
            ? String(data.asInfo ?? data.asGuide)
            : undefined,
          asPhone: data.asPhone != null ? String(data.asPhone) : undefined,
          description: data.description ? String(data.description) : null,
          keywords: Array.isArray(data.keywords) ? data.keywords : undefined,
          tags: Array.isArray(data.tags) ? data.tags : undefined,
          // COPY-AUTO-2 cache: persist the SEO 훅문구 on first create so a re-open
          // loads it and skips AI re-generation (canonical column, Naver register).
          hookPhrase: data.hookPhrase ? String(data.hookPhrase) : null,
          shipping_template_id: data.shipping_template_id
            ? String(data.shipping_template_id)
            : null,
          supplierId,
          userId,
          ...(mapped ? mapped.productFields : {}),
        },
      });

      if (mapped) {
        await tx.product_options.create({
          data: {
            product_id:   created.id,
            option_type:  mapped.productOptions.option_type,
            option_names: mapped.productOptions.option_names,
            option_rows:  mapped.productOptions.option_rows,
          },
        });
      }

      return created;
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
// #150 (supersedes the old REJECT_KEYS denylist, B-5): any key not a real,
// writable Product column (e.g. `stock`, relation accessors, or the legacy
// `asGuide` which lives on StoreSettings) is stripped via the schema-derived
// allowlist in sanitizeProductWrite — a stray key can no longer 500 the save.
function coerceInt(value: unknown, fallback = 0): number {
  if (value === null || value === undefined || value === '') return fallback;
  const n = typeof value === 'number' ? value : parseInt(String(value), 10);
  return Number.isFinite(n) ? n : fallback;
}

export async function PUT(request: NextRequest) {
  try {
    const data = await request.json();
    const { id, ...rawUpdate } = data;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Product ID required' },
        { status: 400 }
      );
    }

    // #150: restrict to real, writable Product columns (allowlist derived from
    // the Prisma schema) and remap legacy aliases (asGuide -> asInfo) before
    // forwarding to Prisma. Unknown keys are dropped, never forwarded.
    const updateData = sanitizeProductWrite(rawUpdate);

    // ⭐ Status 대문자로 정규화
    if (typeof updateData.status === 'string') {
      updateData.status = (updateData.status as string).toUpperCase();
    }

    // ⭐ aiScore null 방지
    if (updateData.aiScore === null || updateData.aiScore === undefined) {
      updateData.aiScore = 0;
    }

    // Numeric coercion only when caller actually sent the field (PATCH-style).
    if ('salePrice' in updateData)     updateData.salePrice     = coerceInt(updateData.salePrice);
    if ('supplierPrice' in updateData) updateData.supplierPrice = coerceInt(updateData.supplierPrice);
    if ('shippingFee' in updateData)   updateData.shippingFee   = coerceInt(updateData.shippingFee);

    // Capture previous score BEFORE update for drop detection
    const prevData = await prisma.product.findUnique({ where: { id }, select: { aiScore: true } });
    const previousScore = prevData?.aiScore ?? null;

    const product = await prisma.product.update({
      where: { id },
      data: updateData as Parameters<typeof prisma.product.update>[0]['data'],
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
