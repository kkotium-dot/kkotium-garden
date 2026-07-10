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
import { naverRequest, NaverApiError, uploadImagesToNaver, getProduct } from '@/lib/naver/api-client';
import { buildNaverProductPayload } from '@/lib/naver/product-builder';
import { loadNaverUpdateContext } from '@/lib/naver/load-update-context';

// v2 상품 수정 null 방어 (권위=NAVER_STORE_OPERATIONS_UPDATE_2026-07-09 §4-C):
// v2 PUT은 FULL REPLACE 이므로 DB에서 재구성한 payload의 detailContent/seoInfo가
// 실질적으로 비어 있으면(placeholder-only 상세, 빈 sellerTags/metaDescription)
// 네이버 측 실사용 값(태그·상세 HTML)을 그대로 덮어씀 → 데이터 유실. 방어:
//   1. UPDATE 실행 직전 GET origin-products/{no} 로 현재 네이버 값 확보.
//   2. DB-built 값이 아래 판정에서 "빈 것으로 간주"면 네이버-side 값으로 대체.
//      · detailContent = placeholder(<div>${name}</div> 뿐, 그 외 <img>/<div> 무)
//      · seoInfo.sellerTags = 없음/빈배열 & 네이버-side 태그 존재
//      · seoInfo.metaDescription = 빈 문자열 & 네이버-side 값 존재
//   3. 명시 재전송(payload 에서 필드를 절대 drop 하지 않음) → 필드 자체 초기화 방지.

/** DB-built detailContent가 placeholder(제품명 div 하나) 뿐인지 판정. */
function isPlaceholderDetail(html: string): boolean {
  const stripped = html.replace(/\s+/g, ' ').trim();
  // buildDetailContent placeholder pattern — text-align:center; padding:40px; color:#888
  return /^<div style="text-align:center;padding:40px;font-size:14px;color:#888;">[^<]*<\/div>$/.test(stripped);
}

export const dynamic = 'force-dynamic';

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

    // 1. Load + assemble the full update context (shared SoT with the
    //    publish-preview screen — both build the identical payload).
    const ctx = await loadNaverUpdateContext(productId);
    if (!ctx) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
    }

    // 2. UPDATE guard — the product MUST already be registered on Naver.
    if (!ctx.dbProduct.naverProductId) {
      return NextResponse.json({
        success: false,
        error: '아직 네이버에 등록되지 않은 상품입니다 — 수정이 아니라 신규 발행(register)을 사용하세요.',
        stage: 'NOT_REGISTERED',
      }, { status: 409 });
    }
    const naverProductId = ctx.dbProduct.naverProductId;

    // 3. Addresses guard — a real PUT requires synced address ids.
    if (!ctx.addresses) {
      return NextResponse.json({
        success: false,
        error: '네이버 출고지/반품지 주소록이 캐시되지 않아 수정할 수 없습니다. GET /api/naver/addressbooks 로 주소록을 동기화하세요.',
        action: 'SYNC_ADDRESSBOOK',
      }, { status: 400 });
    }

    const { product, validation, deliveryInfo, noticeAssets, storeName } = ctx;

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
          // productInfoProvidedNotice (legal disclosure) — surfaced so the
          // operator can verify the safety-confirmation declaration number
          // (HB...) inside etc.qualityAssuranceStandard before the irreversible PUT.
          productInfoProvidedNotice:
            payload.originProduct.detailAttribute?.productInfoProvidedNotice ?? null,
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

    // 9-2. Null defense (§4-C) — GET current Naver state, preserve detailContent /
    // sellerTags / metaDescription when the DB-built payload is degenerate. Failure
    // to GET is non-fatal (proceed with DB-built values) — the update still runs.
    let nullDefenseNote: string[] = [];
    try {
      const current = await getProduct(naverProductId);
      const curOrigin = current?.originProduct as Record<string, unknown> | undefined;
      const curDetailContent = typeof curOrigin?.detailContent === 'string'
        ? (curOrigin.detailContent as string)
        : '';
      const curSeo = ((curOrigin?.detailAttribute as Record<string, unknown> | undefined)
        ?.seoInfo as Record<string, unknown> | undefined);
      const curSellerTags = Array.isArray(curSeo?.sellerTags)
        ? (curSeo?.sellerTags as Array<{ code?: number; text: string }>)
        : [];
      const curMetaDesc = typeof curSeo?.metaDescription === 'string'
        ? (curSeo.metaDescription as string)
        : '';

      // detailContent — DB placeholder-only + Naver 실사용 값 존재 → 보존
      if (isPlaceholderDetail(payload.originProduct.detailContent) && curDetailContent.trim().length > 0) {
        payload.originProduct.detailContent = curDetailContent;
        nullDefenseNote.push('detailContent=preserved');
      }

      // seoInfo — 항상 재전송(payload에 이미 객체 존재). 하위 필드만 방어.
      const seo = payload.originProduct.detailAttribute?.seoInfo;
      if (seo) {
        // sellerTags: DB 빈배열/부재 + 네이버 태그 존재 → 보존
        if ((!seo.sellerTags || seo.sellerTags.length === 0) && curSellerTags.length > 0) {
          seo.sellerTags = curSellerTags
            .filter(t => t && typeof t.text === 'string')
            .map(t => ({ text: String(t.text).slice(0, 20) }));
          nullDefenseNote.push(`sellerTags=preserved(${seo.sellerTags.length})`);
        }
        // metaDescription: DB 빈문자열 + 네이버 값 존재 → 보존
        if ((!seo.metaDescription || seo.metaDescription.trim().length === 0) && curMetaDesc.trim().length > 0) {
          seo.metaDescription = curMetaDesc;
          nullDefenseNote.push('metaDescription=preserved');
        }
      }
    } catch (getErr: unknown) {
      // GET 실패는 fatal 아님 — 로그만 남기고 DB-built payload 그대로 PUT.
      console.warn(
        '[naver/products/update] GET current-state failed — null defense skipped:',
        getErr instanceof Error ? getErr.message : String(getErr),
      );
      nullDefenseNote.push('get-failed');
    }

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
          note: `PUT origin-products (rep:${naverImageUrls?.representative ? 'shop-phinf' : 'unchanged'})${nullDefenseNote.length > 0 ? ` [null-defense: ${nullDefenseNote.join(',')}]` : ''}`,
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
      nullDefense: nullDefenseNote,
    });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Naver product update error:', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
