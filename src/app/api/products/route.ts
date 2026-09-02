// src/app/api/products/route.ts
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 상품 목록 API (Status 대소문자 통일 + aiScore null 처리)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { calcHoneyScore } from '@/lib/honey-score';
import { sendDiscord, buildScoreDropEmbed } from '@/lib/discord';
import { prisma } from '@/lib/prisma';
import { generateUniqueSku } from '@/lib/sku-engine';
import { mapCrawlOptions } from '@/lib/sources/crawl-option-mapper';
import { parseDomeProductNo } from '@/lib/sources/parse-dome-no';
import { sanitizeProductWrite } from '@/lib/product-write-fields';
import { resolveCategoryDbId, isValidCategoryDbId } from '@/lib/naver/category-sync';
import { loadTuningScores } from '@/lib/products/tuning-signals';

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
        // naver_categories FK — distinct from naverCategoryCode, see
        // src/lib/naver/category-id-resolver.ts header (2026-09-02).
        category_id: true,
        naverProductId: true,
        // Registration status (#240) + revival scoring (#244) + source tag (#245)
        // for the hub axis. origin_kind column is live (Desktop applied the
        // migration, verified); deriveOriginKind reads it and falls back to
        // naverProductId for any row that predates the backfill.
        naver_status_type: true,
        origin_kind: true,
        driftFields: true, // hub drift filter (#245) — app↔Naver out-of-sync
        shippingFee: true,
        shipping_fee_type: true,
        shipping_template_id: true,
        return_care_enabled: true,
        keywords: true,
        tags: true,
        // UCE-4 (2026-08-27): 'category_confirm_needed' tag set by
        // /api/category/suggest when deterministic+AI+page-validation all
        // failed to find a category — surfaces a "카테고리 확인 필요" queue
        // distinct from "카테고리 미선택" (which just means nobody picked one).
        internalTags: true,
        // Tuning score inputs (#256 P4) — loadTuningScores() needs these to
        // compute the same signal set used by /api/products/linked. (category
        // is already selected above for the search filter.)
        lastSaleDate: true,
        // 자산 보호 판단(#272) — 판매 이력이 있으면 리뷰·검색순위가 상품 URL에
        // 축적돼 있으므로 삭제가 아니라 판매중지+대체소싱을 권한다.
        salesCount: true,
        supplier_product_code: true,
        // A-2(#334): IMPORTED 상품은 네이버 API가 원가를 안 줘서 supplierPrice=0로
        // 저장된다 — MarginCell이 "0원"을 실제 원가로 오인해 마진%를 지어내지
        // 않도록 source를 함께 내려준다.
        source: true,
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

    // Tuning score enrichment (#256 P4) — best-effort, must never break the
    // list response if scoring hiccups (#82). Same engine/inputs as
    // /api/products/linked so warehouse and quality-signal views agree.
    let tuningById: Awaited<ReturnType<typeof loadTuningScores>> = new Map();
    try {
      tuningById = await loadTuningScores(normalizedProducts as unknown as Parameters<typeof loadTuningScores>[0]);
    } catch (err) {
      console.error('튜닝 점수 계산 오류(리스트는 정상 반환):', err);
    }
    const productsWithTuning = normalizedProducts.map((p) => ({
      ...p,
      tuningScore: tuningById.get(p.id) ?? null,
    }));

    return NextResponse.json({
      success: true,
      products: productsWithTuning,
      total: productsWithTuning.length,
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
          // 2026-09-03 (#356 근본원인 수정): 예전엔 미입력 시 KKOTIUM_DEFAULTS.
          // categoryCode(='50004716')를 그대로 채웠다 — codes.ts 주석은 "꽃다발"
          // 이지만 NAVER_CATEGORIES_FULL(실제 발행에 쓰이는 마스터) 기준
          // 이 코드는 "식품>수산물>해산물/어패류>홍합"이다(꽃다발 리프는 마스터에
          // 없음). #356에서 반복 발견된 "홍합" 오염의 진짜 근본원인 — 매처가
          // 아니라 이 하드코딩 기본값이 매번 새 상품에 조용히 찍히고 있었다.
          // 확신 없으면 정직하게 비워두는 게 개악보다 낫다(#352/#355) — 빈
          // 값이면 UCE-4 개입큐(사람 확인)로 흘러간다.
          naverCategoryCode: String(data.naverCategoryCode || ''),
          salePrice,
          supplierPrice,
          margin,
          status: normalizedStatus,
          brand: String(data.brand || '꽃틔움'),
          manufacturer: String(data.manufacturer || '도매매 공급사'),
          // 2026-09-03: 원산지도 동일 원칙 — 미입력 시 KKOTIUM_DEFAULTS.originCode
          // (='0200037' 중국)로 추측해 찍지 않는다(추측=법적 위험, gate-message-
          // i18n.ts와 동일 원칙). data.originCode가 없으면 필드 자체를 생략해
          // Prisma 스키마 기본값('0001'=미선택 센티널, import/route.ts와 동일
          // 취급)이 적용되게 둔다.
          ...(data.originCode ? { originCode: String(data.originCode) } : {}),
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
          // §4-A 단위가격 unitCapacity — 대상 카테고리(식품·화장품·생활위생)에서 필수.
          unit_price_yn:        typeof data.unit_price_yn === 'boolean' ? data.unit_price_yn : null,
          unit_total_capacity:  data.unit_total_capacity != null ? Number(data.unit_total_capacity) : null,
          unit_capacity:        data.unit_capacity       != null ? Number(data.unit_capacity)       : null,
          unit_indication_unit: data.unit_indication_unit ? String(data.unit_indication_unit) : null,
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
          // #250: selected Naver template codes → bulk excel 제공고시/AS 컬럼.
          noticeTemplateCode: data.noticeTemplateCode != null ? String(data.noticeTemplateCode) : undefined,
          asTemplateCode: data.asTemplateCode != null ? String(data.asTemplateCode) : undefined,
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

      // SEED-SAVE C-3 (#82): atomically link the originating 꿀통 crawl_log to the
      // new 창고 Product so the same item stops showing in both places. Link by the
      // explicit crawlLogId (history → 씨앗심기) or, failing that, the source URL
      // (carried by every prefill path). `product_id IS NULL` keeps it idempotent —
      // a re-save never steals an already-linked log. sourcing_status → REGISTERED
      // matches the existing batch-register taxonomy (a Product now exists for it).
      const crawlLogId = typeof data.crawlLogId === 'string' ? data.crawlLogId.trim() : '';
      const crawlSourceUrl =
        (typeof data.crawlSourceUrl === 'string' && data.crawlSourceUrl.trim()) ||
        (typeof data.sourceUrl === 'string' && data.sourceUrl.trim()) || '';
      if (crawlLogId) {
        await tx.$executeRaw`
          UPDATE crawl_logs SET sourcing_status = 'REGISTERED', product_id = ${created.id}
          WHERE id = ${crawlLogId} AND product_id IS NULL`;
      } else if (crawlSourceUrl) {
        await tx.$executeRaw`
          UPDATE crawl_logs SET sourcing_status = 'REGISTERED', product_id = ${created.id}
          WHERE url = ${crawlSourceUrl} AND product_id IS NULL`;
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

    // Capture previous score + naverCategoryCode BEFORE update (score-drop
    // check + the category_id derivation below both need the prior row).
    const prevData = await prisma.product.findUnique({ where: { id }, select: { aiScore: true, naverCategoryCode: true } });

    // 2026-09-02 (반자동 개입큐 저장단계 연결), 2026-09-03 재발방지 수정:
    // category_id는 schema-derived allowlist(sanitizeProductWrite)를 이미
    // 통과하지만, 무효 id 방어가 없었다 — naver_categories에 없는 id면 그
    // 필드만 버린다(#150과 동일 원칙, 다른 필드 저장은 막지 않음).
    //
    // ⚠️ naverCategoryCode가 "이번 요청에 포함됨"만으로 derive하면 안 된다 —
    // 씨앗심기 autosave는 변경 여부와 무관하게 매 저장마다 naverCategoryCode를
    // 그대로 다시 보낸다. 그래서 오래된(과거 오분류) naverCategoryCode를 가진
    // 상품을 편집 화면에 열기만 해도 autosave가 그 STALE 코드로 category_id를
    // 재기입해 clear-known-wrong로 지운 값이 되살아나는 사고가 실측으로
    // 확인됐다(64구 아이스틀, 프로덕션). 반드시 기존 값과 달라졌을 때만
    // derive — 사람이 후보칩을 눌러 실제로 바꾼 경우만 안전하다.
    if ('category_id' in updateData) {
      const raw = updateData.category_id;
      if (raw !== null && (typeof raw !== 'string' || !(await isValidCategoryDbId(raw)))) {
        console.warn('[PUT /api/products] invalid category_id dropped:', JSON.stringify(raw).slice(0, 80));
        delete updateData.category_id;
      }
    }
    if (
      'naverCategoryCode' in updateData &&
      !('category_id' in updateData) &&
      typeof updateData.naverCategoryCode === 'string' &&
      updateData.naverCategoryCode !== (prevData?.naverCategoryCode ?? '')
    ) {
      const resolved = await resolveCategoryDbId(updateData.naverCategoryCode);
      if (resolved) updateData.category_id = resolved;
    }
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
