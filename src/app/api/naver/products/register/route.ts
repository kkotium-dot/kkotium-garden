// src/app/api/naver/products/register/route.ts
// C-1: Naver Commerce API direct product registration
// POST /api/naver/products/register { productId, skipImageUpload?, forceRegister? }
// Flow: validate (C-8 + readiness) -> build payload -> register -> save naverProductId

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { naverRequest, NaverApiError } from '@/lib/naver/api-client';
import {
  buildNaverProductPayload,
  buildDeliveryInfo,
  buildDeliveryInfoFromProduct,
  validateForRegistration,
  type LocalProduct,
  type ShippingTemplateData,
  type AddressIds,
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

    // 6. Build delivery info (from template or product fields)
    const deliveryInfo = shippingTemplate
      ? buildDeliveryInfo(shippingTemplate, addresses)
      : buildDeliveryInfoFromProduct(product, addresses);

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

    // 7. Build full payload
    // Image URLs: use Supabase URLs directly — Naver API accepts external URLs
    // and copies them to its own CDN (shop1.phinf.naver.net) automatically
    const payload = buildNaverProductPayload(product, deliveryInfo, undefined, noticeAssets);

    // 7-a. dryRun — echo payload (and a shallow shape preview) without calling
    // Naver. Lets the operator inspect what would be sent before committing the
    // irreversible POST. No DB writes happen on dryRun.
    if (dryRun) {
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
        },
        payload,
      });
    }

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
