// src/app/api/naver/products/register/route.ts
// C-1: Naver Commerce API direct product registration
// POST /api/naver/products/register { productId, skipImageUpload?, forceRegister? }
// Flow: validate (C-8 + readiness) -> build payload -> register -> save naverProductId

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { naverRequest, NaverApiError, uploadImagesToNaver } from '@/lib/naver/api-client';
import {
  buildNaverProductPayload,
  buildDeliveryInfo,
  buildDeliveryInfoFromProduct,
  validateForRegistration,
  type LocalProduct,
  type ShippingTemplateData,
  type AddressIds,
  type SupplierBundleInfo,
} from '@/lib/naver/product-builder';

export const dynamic = 'force-dynamic';

// ── Get cached address IDs from StoreSettings dedicated columns ──────────────
// 2026-06-02 P0: migrated from asGuide JSON cache → releaseAddressId / returnAddressId
// columns (see RESEARCH §3 — dropship single representative pair pattern).

async function getAddressIds(): Promise<AddressIds | null> {
  try {
    const settings = await prisma.storeSettings.findFirst({
      select: { releaseAddressId: true, returnAddressId: true },
    });
    if (!settings?.releaseAddressId || !settings?.returnAddressId) return null;
    const release = Number(settings.releaseAddressId);
    const ret     = Number(settings.returnAddressId);
    if (!Number.isFinite(release) || !Number.isFinite(ret) || release <= 0 || ret <= 0) return null;
    return { releaseAddressId: release, returnAddressId: ret };
  } catch {
    return null;
  }
}

// ── POST handler ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productId, forceRegister, dryRun } = body as {
      productId: string;
      forceRegister?: boolean;
      dryRun?: boolean;
    };

    if (!productId) {
      return NextResponse.json(
        { success: false, error: 'productId is required' },
        { status: 400 }
      );
    }

    // 1. Load product with relations
    const dbProduct = await prisma.product.findUnique({
      where: { id: productId },
      include: { product_options: true },
    });

    if (!dbProduct) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
    }

    if (dbProduct.naverProductId) {
      return NextResponse.json(
        { success: false, error: 'Already registered on Naver', naverProductId: dbProduct.naverProductId },
        { status: 409 }
      );
    }

    // 1-b. ORDER_MADE guard — 주문제작 상품은 표준 위탁 배송 파이프라인에서 분리.
    // 전용 배송설계(제작기간/입금확인 발송 등)는 후속 turn. dryRun은 통과시켜
    // payload 점검은 허용하되, 실 register는 차단 (오발행 방지).
    if (dbProduct.shippingAttribute === 'ORDER_MADE' && !dryRun && !forceRegister) {
      return NextResponse.json({
        success: false,
        error:
          '주문제작(ORDER_MADE) 상품은 표준 위탁 발행 파이프라인 대상이 아닙니다. ' +
          '전용 배송 설계(제작 기간 안내, 입금 확인 후 발송 등) 적용 후 발행하세요.',
        stage: 'ORDER_MADE_GUARD',
        shippingAttribute: dbProduct.shippingAttribute,
      }, { status: 409 });
    }

    // 2. Load shipping template if linked
    let shippingTemplate: ShippingTemplateData | null = null;
    if (dbProduct.shipping_template_id) {
      const tmpl = await prisma.shippingTemplate.findUnique({
        where: { id: dbProduct.shipping_template_id },
      });
      if (tmpl) {
        shippingTemplate = {
          courierCode: tmpl.courierCode,
          shippingType: tmpl.shippingType,
          shippingFee: tmpl.shippingFee,
          freeThreshold: tmpl.freeThreshold,
          returnFee: tmpl.returnFee,
          exchangeFee: tmpl.exchangeFee,
          jejuFee: tmpl.jejuFee,
          islandFee: tmpl.islandFee,
        };
      }
    }

    // 2-b. Load supplier bundle attributes (합배송 분기용).
    let bundleInfo: SupplierBundleInfo | undefined;
    if (dbProduct.supplierId) {
      const supplier = await prisma.supplier.findUnique({
        where: { id: dbProduct.supplierId },
        select: {
          bundleCapable: true,
          naverBundleGroupId: true,
          jejuExtraFee: true,
          islandExtraFee: true,
        },
      });
      if (supplier) {
        bundleInfo = {
          bundleCapable: supplier.bundleCapable,
          naverBundleGroupId: supplier.naverBundleGroupId,
          jejuExtraFee: supplier.jejuExtraFee,
          islandExtraFee: supplier.islandExtraFee,
        };
      }
    }

    // 3. Get address IDs
    const addresses = await getAddressIds();

    // 4. Map DB product to LocalProduct interface
    const product: LocalProduct = {
      ...dbProduct,
      additionalImages: dbProduct.additionalImages as unknown,
      keywords: dbProduct.keywords as unknown,
      tags: dbProduct.tags as unknown,
      product_options: dbProduct.product_options ?? null,
    };

    // 5. Validate (C-8 attribute completeness + upload readiness gate)
    const validation = validateForRegistration(
      product,
      !!shippingTemplate,
      !!addresses,
    );

    if (!validation.canRegister && !forceRegister) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed — fix issues before registration',
        validation,
      }, { status: 422 });
    }

    if (!addresses) {
      return NextResponse.json({
        success: false,
        error:
          '네이버 출고지/반품지 주소록이 캐시되지 않아 발행할 수 없습니다. ' +
          '1) 판매자센터 → 판매자정보 → 배송정보 → 주소록에서 RELEASE / REFUND_OR_EXCHANGE 주소를 등록한 뒤 ' +
          '2) GET /api/naver/addressbooks 를 호출해 StoreSettings.releaseAddressId / returnAddressId 를 채워주세요. ' +
          '(RESEARCH §3 — 위탁배송 단일 대표주소 모델)',
        action: 'SYNC_ADDRESSBOOK',
        endpoint: 'GET /api/naver/addressbooks',
      }, { status: 400 });
    }

    // 6. Build delivery info (from template or product fields) with supplier
    // bundle branch (deliveryBundleGroupId vs deliveryFeeByArea — RESEARCH §B).
    const deliveryInfo = shippingTemplate
      ? buildDeliveryInfo(shippingTemplate, addresses, bundleInfo)
      : buildDeliveryInfoFromProduct(product, addresses, bundleInfo);

    // 6-b. Load common notice slots (store-wide top/bottom image + text)
    // injected into detailContent. Nullable — render-empty when unset.
    const noticeSettings = await prisma.storeSettings.findFirst({
      select: {
        noticeTopImageUrl: true,
        noticeTopText: true,
        noticeBottomImageUrl: true,
        noticeBottomText: true,
      },
    });
    const noticeAssets = {
      topImageUrl:    noticeSettings?.noticeTopImageUrl    ?? null,
      topText:        noticeSettings?.noticeTopText        ?? null,
      bottomImageUrl: noticeSettings?.noticeBottomImageUrl ?? null,
      bottomText:     noticeSettings?.noticeBottomText     ?? null,
    };

    // 7-pre. dryRun preview — build with Supabase URLs (no Naver upload). The
    // real register path below uploads to Naver first, then rebuilds.
    if (dryRun) {
    const payload = buildNaverProductPayload(product, deliveryInfo, undefined, noticeAssets);
      const dc = payload.originProduct.detailContent;
      const pin = payload.originProduct.detailAttribute?.productInfoProvidedNotice;
      return NextResponse.json({
        success: true,
        dryRun: true,
        validation,
        payloadPreview: {
          leafCategoryId: payload.originProduct.leafCategoryId,
          name: payload.originProduct.name,
          salePrice: payload.originProduct.salePrice,
          stockQuantity: payload.originProduct.stockQuantity,
          statusType: payload.originProduct.statusType,
          representativeImage: payload.originProduct.images.representativeImage.url,
          optionalImageCount: payload.originProduct.images.optionalImages?.length ?? 0,
          deliveryCompany: payload.originProduct.deliveryInfo.deliveryCompany,
          deliveryBranch: {
            // Supplier bundle 분기 결과 — RESEARCH §B 양립불가 검증.
            bundleCapable: bundleInfo?.bundleCapable ?? false,
            deliveryBundleGroupUsable: payload.originProduct.deliveryInfo.deliveryBundleGroupUsable,
            deliveryBundleGroupId: payload.originProduct.deliveryInfo.deliveryBundleGroupId ?? null,
            deliveryFeeByArea: payload.originProduct.deliveryInfo.deliveryFee.deliveryFeeByArea ?? null,
            mutuallyExclusiveOk:
              !(payload.originProduct.deliveryInfo.deliveryBundleGroupId
                && payload.originProduct.deliveryInfo.deliveryFee.deliveryFeeByArea),
          },
          claimDeliveryInfo: payload.originProduct.deliveryInfo.claimDeliveryInfo,
          originAreaInfo: payload.originProduct.detailAttribute?.originAreaInfo,
          afterServiceInfo: payload.originProduct.detailAttribute?.afterServiceInfo,
          taxType: payload.originProduct.detailAttribute?.taxType,
          minorPurchasable: payload.originProduct.detailAttribute?.minorPurchasable,
          optionCombinationCount:
            payload.originProduct.detailAttribute?.optionInfo?.optionCombinations?.length ?? 0,
          detailContentLength: dc.length,
          productInfoProvidedNotice: {
            type: pin?.productInfoProvidedNoticeType ?? null,
            etcKeys: pin?.etc ? Object.keys(pin.etc) : [],
            etcSample: pin?.etc ? {
              itemName: pin.etc.itemName,
              modelName: pin.etc.modelName,
              manufacturer: pin.etc.manufacturer,
              customerServicePhoneNumber: pin.etc.customerServicePhoneNumber,
            } : null,
          },
          noticeSlots: {
            topImageUrlPresent:    !!noticeAssets.topImageUrl,
            topTextPresent:        !!noticeAssets.topText,
            bottomImageUrlPresent: !!noticeAssets.bottomImageUrl,
            bottomTextPresent:     !!noticeAssets.bottomText,
            topImageUrl:           noticeAssets.topImageUrl,
            bottomImageUrl:        noticeAssets.bottomImageUrl,
          },
          missingFields: {
            // Surface common 400 culprits at a glance
            leafCategoryIdEmpty: !payload.originProduct.leafCategoryId,
            productInfoProvidedNoticeMissing: !pin,
          },
          imagesToUpload: {
            // Real register will upload these to Naver first (Supabase URLs here).
            mainImage: product.mainImage ?? null,
            detailImage: product.detail_image_url ?? null,
            additionalCount: Array.isArray(product.additionalImages)
              ? (product.additionalImages as unknown[]).length : 0,
            note: 'dryRun shows Supabase URLs — real register replaces with shop-phinf URLs after upload',
          },
        },
        payload,
      });
    }

    // 7-img. Upload product images to Naver FIRST (RESEARCH §1 — external URLs
    // are rejected; representativeImage.url must be a shop-phinf URL returned by
    // the image-upload API). Build the Supabase→Naver map, then rebuild payload.
    const supaMain = product.mainImage ?? '';
    const supaAdditional: string[] = Array.isArray(product.additionalImages)
      ? (product.additionalImages as unknown[]).filter((u): u is string => typeof u === 'string' && !!u)
      : [];
    const supaDetail = product.detail_image_url ?? '';

    // Order: [main, ...additional]. Detail image uploaded separately so we can
    // swap its <img> src inside detailContent without polluting optionalImages.
    const galleryUrls = [supaMain, ...supaAdditional].filter(Boolean);
    let naverGallery: string[] = [];
    let naverDetail: string | null = null;
    try {
      if (galleryUrls.length > 0) {
        naverGallery = await uploadImagesToNaver(galleryUrls);
      }
      if (supaDetail) {
        const [d] = await uploadImagesToNaver([supaDetail]);
        naverDetail = d ?? null;
      }
    } catch (uploadErr: unknown) {
      const isNaver = uploadErr instanceof NaverApiError;
      return NextResponse.json({
        success: false,
        error: '네이버 이미지 업로드 실패 — 발행 중단 (DRAFT 유지)',
        stage: 'IMAGE_UPLOAD',
        detail: isNaver ? uploadErr.message : String(uploadErr),
        diagnostic: isNaver ? uploadErr.diagnostic : undefined,
        attempted: { gallery: galleryUrls, detail: supaDetail || null },
      }, { status: 502 });
    }

    if (galleryUrls.length > 0 && naverGallery.length === 0) {
      return NextResponse.json({
        success: false,
        error: '네이버 이미지 업로드가 URL을 반환하지 않음 — 발행 중단',
        stage: 'IMAGE_UPLOAD',
      }, { status: 502 });
    }

    // Replace detail_image_url with the Naver URL so buildDetailContent emits a
    // shop-phinf <img> src (external URL → InvalidImageUrl 400, RESEARCH §4).
    const productForBuild: typeof product = {
      ...product,
      detail_image_url: naverDetail ?? product.detail_image_url,
    };

    // 7. Build full payload with Naver shop-phinf URLs.
    const naverImageUrls = naverGallery.length > 0
      ? { representative: naverGallery[0], optional: naverGallery.slice(1) }
      : undefined;
    const payload = buildNaverProductPayload(productForBuild, deliveryInfo, naverImageUrls, noticeAssets);

    // 8. Register on Naver Commerce API
    let result: any;
    try {
      result = await naverRequest<any>('POST', '/v2/products', payload);
    } catch (registerErr: unknown) {
      // NaverApiError carries the structured diagnostic (kind/status/bodyHead/
      // gwTraceId). Surface it verbatim so the operator can read Naver's
      // rejection reason without grepping Vercel runtime logs.
      if (registerErr instanceof NaverApiError) {
        return NextResponse.json({
          success: false,
          error: registerErr.message,
          diagnostic: registerErr.diagnostic,
          payloadPreview: {
            leafCategoryId: payload.originProduct.leafCategoryId,
            name: payload.originProduct.name,
            salePrice: payload.originProduct.salePrice,
            representativeImage: payload.originProduct.images.representativeImage.url,
          },
        }, { status: 502 });
      }
      throw registerErr;
    }
    const naverProductId = String(
      result?.productNo ?? result?.originProductNo ?? result?.id ?? ''
    );

    if (!naverProductId) {
      return NextResponse.json({
        success: false,
        error: 'Registration API returned no product ID',
        naverResponse: result,
      }, { status: 500 });
    }

    // 9. Update local DB: save naverProductId + set ACTIVE
    await prisma.product.update({
      where: { id: productId },
      data: {
        naverProductId,
        status: 'ACTIVE',
        updatedAt: new Date(),
      },
    });

    // 10. Log registration event
    try {
      await prisma.productEvent.create({
        data: {
          productId,
          type: 'NAVER_REGISTERED',
          oldValue: dbProduct.status,
          newValue: naverProductId,
          note: `API direct (attr:${validation.attributeGrade} readiness:${validation.readinessScore}%)`,
        },
      });
    } catch {
      // Non-critical — event logging failure should not block registration
    }

    return NextResponse.json({
      success: true,
      naverProductId,
      validation,
    });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Naver product registration error:', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
