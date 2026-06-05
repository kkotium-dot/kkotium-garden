// src/app/api/naver/products/update/route.ts
// Naver Commerce API v2 — existing product UPDATE (PUT).
// POST /api/naver/products/update { productId, dryRun?, confirm?, fields? }
//
// Endpoint: PUT /v2/products/origin-products/{originProductNo}
//   ★ Naver v2 update is a FULL REPLACE — fields omitted from the request are
//     REMOVED from the product (commerce-api discussion #1650). So we ALWAYS
//     rebuild the COMPLETE payload from the current DB row (same builder the
//     register route uses) and PUT the whole thing. `fields` is advisory only
//     (which DB columns the caller intends to change); the payload is full.
//
// Safety (irreversible-write guard):
//   - The real PUT runs ONLY when `confirm === true` AND `dryRun !== true`.
//   - Any other call (default, or dryRun:true) returns a dryRun preview and
//     never touches Naver. A bare call can never mutate the live product.
//
// Image change parity with register: when a fresh representative/detail image
// is present, it is uploaded to Naver first (external URL -> shop-phinf), then
// the payload is rebuilt with the shop-phinf URLs before the PUT.

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

// Mirror of register route's notice-slot code defaults — kept null until the
// common assets exist so neither dryRun nor a real PUT claims a 404 asset.
const DEFAULT_NOTICE_TOP_IMAGE_URL: string | null = null;
const DEFAULT_NOTICE_BOTTOM_IMAGE_URL: string | null = null;

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productId, dryRun, confirm, fields } = body as {
      productId: string;
      dryRun?: boolean;
      confirm?: boolean;
      fields?: string[];
    };

    if (!productId) {
      return NextResponse.json({ success: false, error: 'productId is required' }, { status: 400 });
    }

    // Real PUT only when explicitly confirmed and not dry-running. Otherwise
    // this is a safe preview.
    const isDryRun = dryRun === true || confirm !== true;

    // 1. Load product with relations
    const dbProduct = await prisma.product.findUnique({
      where: { id: productId },
      include: { product_options: true },
    });
    if (!dbProduct) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
    }

    // 2. UPDATE guard — the product MUST already be registered on Naver.
    if (!dbProduct.naverProductId) {
      return NextResponse.json({
        success: false,
        error: '아직 네이버에 등록되지 않은 상품입니다 — 수정이 아니라 신규 발행(register)을 사용하세요.',
        stage: 'NOT_REGISTERED',
      }, { status: 409 });
    }
    const naverProductId = dbProduct.naverProductId;

    // 3. Shipping template (same as register)
    let shippingTemplate: ShippingTemplateData | null = null;
    if (dbProduct.shipping_template_id) {
      const tmpl = await prisma.shippingTemplate.findUnique({ where: { id: dbProduct.shipping_template_id } });
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

    // 3-b. Supplier bundle attributes
    let bundleInfo: SupplierBundleInfo | undefined;
    if (dbProduct.supplierId) {
      const supplier = await prisma.supplier.findUnique({
        where: { id: dbProduct.supplierId },
        select: { bundleCapable: true, naverBundleGroupId: true, jejuExtraFee: true, islandExtraFee: true },
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

    // 4. Addresses
    const addresses = await getAddressIds();
    if (!addresses) {
      return NextResponse.json({
        success: false,
        error: '네이버 출고지/반품지 주소록이 캐시되지 않아 수정할 수 없습니다. GET /api/naver/addressbooks 로 주소록을 동기화하세요.',
        action: 'SYNC_ADDRESSBOOK',
      }, { status: 400 });
    }

    // 5. Map to LocalProduct
    const product: LocalProduct = {
      ...dbProduct,
      additionalImages: dbProduct.additionalImages as unknown,
      keywords: dbProduct.keywords as unknown,
      tags: dbProduct.tags as unknown,
      product_options: dbProduct.product_options ?? null,
    };

    // 6. Validate (same gate as register)
    const validation = validateForRegistration(product, !!shippingTemplate, !!addresses);

    // 7. Delivery + notice
    const deliveryInfo = shippingTemplate
      ? buildDeliveryInfo(shippingTemplate, addresses, bundleInfo)
      : buildDeliveryInfoFromProduct(product, addresses, bundleInfo);

    const noticeSettings = await prisma.storeSettings.findFirst({
      select: {
        storeName: true,
        noticeTopImageUrl: true,
        noticeTopText: true,
        noticeBottomImageUrl: true,
        noticeBottomText: true,
      },
    });
    const noticeAssets = {
      topImageUrl:    noticeSettings?.noticeTopImageUrl    ?? DEFAULT_NOTICE_TOP_IMAGE_URL,
      topText:        noticeSettings?.noticeTopText        ?? null,
      bottomImageUrl: noticeSettings?.noticeBottomImageUrl ?? DEFAULT_NOTICE_BOTTOM_IMAGE_URL,
      bottomText:     noticeSettings?.noticeBottomText     ?? null,
    };
    const storeName = (noticeSettings?.storeName ?? '').trim() || '꽃틔움';

    // 8. dryRun preview — build with Supabase/Cloudinary URLs (no Naver upload,
    // no PUT). Mirrors register's dryRun so the operator can fact-check.
    if (isDryRun) {
      const payload = buildNaverProductPayload(product, deliveryInfo, undefined, noticeAssets, storeName);
      const oa = payload.originProduct.detailAttribute?.originAreaInfo;
      return NextResponse.json({
        success: true,
        dryRun: true,
        mode: 'UPDATE',
        naverProductId,
        endpoint: `PUT /v2/products/origin-products/${naverProductId}`,
        fieldsRequested: Array.isArray(fields) ? fields : null,
        validation,
        payloadPreview: {
          name: payload.originProduct.name,
          leafCategoryId: payload.originProduct.leafCategoryId,
          salePrice: payload.originProduct.salePrice,
          statusType: payload.originProduct.statusType,
          representativeImage: payload.originProduct.images.representativeImage.url,
          optionalImageCount: payload.originProduct.images.optionalImages?.length ?? 0,
          originAreaInfo: oa,
          sellerTags: payload.originProduct.detailAttribute?.seoInfo?.sellerTags?.map(t => t.text) ?? [],
          optionCombinationValues:
            payload.originProduct.detailAttribute?.optionInfo?.optionCombinations?.map(
              c => [c.optionName1, c.optionName2].filter(Boolean).join(' / ')
            ) ?? [],
          imagesToUpload: {
            mainImage: product.mainImage ?? null,
            detailImage: product.detail_image_url ?? null,
            note: 'dryRun shows source URLs — real update (confirm:true) uploads to Naver (shop-phinf) first, then PUTs the full payload',
          },
        },
        note: '실 수정 미실행 — confirm:true 로 호출해야 PUT (비가역). 전체 페이로드 교체이므로 누락 필드는 제거됨에 주의.',
      });
    }

    // 9. Real update — upload images to Naver first (external URL -> shop-phinf),
    // identical to register's 7-img step, then rebuild the FULL payload.
    const supaMain = product.mainImage ?? '';
    const supaAdditional: string[] = Array.isArray(product.additionalImages)
      ? (product.additionalImages as unknown[]).filter((u): u is string => typeof u === 'string' && !!u)
      : [];
    const supaDetail = product.detail_image_url ?? '';
    const galleryUrls = [supaMain, ...supaAdditional].filter(Boolean);

    let naverGallery: string[] = [];
    let naverDetail: string | null = null;
    try {
      if (galleryUrls.length > 0) naverGallery = await uploadImagesToNaver(galleryUrls);
      if (supaDetail) {
        const [d] = await uploadImagesToNaver([supaDetail]);
        naverDetail = d ?? null;
      }
    } catch (uploadErr: unknown) {
      const isNaver = uploadErr instanceof NaverApiError;
      return NextResponse.json({
        success: false,
        error: '네이버 이미지 업로드 실패 — 수정 중단 (기존 상품 미변경)',
        stage: 'IMAGE_UPLOAD',
        detail: isNaver ? uploadErr.message : String(uploadErr),
        diagnostic: isNaver ? uploadErr.diagnostic : undefined,
      }, { status: 502 });
    }
    if (galleryUrls.length > 0 && naverGallery.length === 0) {
      return NextResponse.json({
        success: false,
        error: '네이버 이미지 업로드가 URL을 반환하지 않음 — 수정 중단',
        stage: 'IMAGE_UPLOAD',
      }, { status: 502 });
    }

    const productForBuild: typeof product = {
      ...product,
      detail_image_url: naverDetail ?? product.detail_image_url,
    };
    const naverImageUrls = naverGallery.length > 0
      ? { representative: naverGallery[0], optional: naverGallery.slice(1) }
      : undefined;

    const payload = buildNaverProductPayload(productForBuild, deliveryInfo, naverImageUrls, noticeAssets, storeName);

    // 10. PUT the full payload to the existing product.
    try {
      await naverRequest('PUT', `/v2/products/origin-products/${naverProductId}`, payload);
    } catch (updateErr: unknown) {
      if (updateErr instanceof NaverApiError) {
        return NextResponse.json({
          success: false,
          error: updateErr.message,
          diagnostic: updateErr.diagnostic,
          stage: 'PUT',
        }, { status: 502 });
      }
      throw updateErr;
    }

    // 11. Log update event (non-critical)
    try {
      await prisma.productEvent.create({
        data: {
          productId,
          type: 'NAVER_UPDATED',
          oldValue: naverProductId,
          newValue: Array.isArray(fields) && fields.length > 0 ? fields.join(',') : 'full',
          note: `PUT origin-products (rep:${naverImageUrls?.representative ? 'shop-phinf' : 'unchanged'})`,
        },
      });
    } catch {
      // non-critical
    }

    return NextResponse.json({
      success: true,
      mode: 'UPDATE',
      naverProductId,
      representativeImage: payload.originProduct.images.representativeImage.url,
      validation,
    });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Naver product update error:', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
