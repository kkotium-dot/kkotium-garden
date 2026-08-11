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

const VALID_LEAF_CATEGORY_ID = /^\d{6,10}$/;

// 2026-08-12 — 부분재연동 안전장치 긴급 보강
// (docs/handoff/CODE_PARTIAL_SYNC_SAFETY_HANDOFF_2026-08-11.md): 초기버전 import
// route가 naverCategoryCode/원산지를 채우지 않은 채 임포트한 상품이 다수 존재
// (발행 6건 중 카테고리 5건·원산지 라벨 6건 공백). 앱 DB가 비어 있다고 해서
// "네이버 값도 비어 있다"고 가정하면 안 됨 — v2 PUT은 FULL REPLACE라 그대로
// 보내면 네이버의 실제 값을 지운다. §4-C null 방어를 카테고리/원산지 라벨까지
// 확장하고, dryRun/confirm 양쪽에서 동일하게 적용해 미리보기가 실제 전송값과
// 일치하게 만든다. GET-merge 이후에도 leafCategoryId가 여전히 유효하지 않으면
// (GET 실패 포함) 실 PUT을 하드 블록 — "이 정도면 됐다" 없이 전 상품 공통 방어.
interface NullDefenseResult {
  notes: string[];
  leafCategoryIdInvalid: boolean;
  getFailed: boolean;
}

async function applyNaverStateDefense(
  payload: ReturnType<typeof buildNaverProductPayload>,
  naverProductId: string,
): Promise<NullDefenseResult> {
  const notes: string[] = [];
  let getFailed = false;
  try {
    const current = await getProduct(naverProductId);
    const curOrigin = current?.originProduct as Record<string, unknown> | undefined;
    const curDetailContent = typeof curOrigin?.detailContent === 'string'
      ? (curOrigin.detailContent as string)
      : '';
    const curDetailAttr = curOrigin?.detailAttribute as Record<string, unknown> | undefined;
    const curSeo = curDetailAttr?.seoInfo as Record<string, unknown> | undefined;
    const curSellerTags = Array.isArray(curSeo?.sellerTags)
      ? (curSeo?.sellerTags as Array<{ code?: number; text: string }>)
      : [];
    const curMetaDesc = typeof curSeo?.metaDescription === 'string'
      ? (curSeo.metaDescription as string)
      : '';

    // detailContent — DB placeholder-only + Naver 실사용 값 존재 → 보존
    if (isPlaceholderDetail(payload.originProduct.detailContent) && curDetailContent.trim().length > 0) {
      payload.originProduct.detailContent = curDetailContent;
      notes.push('detailContent=preserved');
    }

    // seoInfo — 항상 재전송(payload에 이미 객체 존재). 하위 필드만 방어.
    const seo = payload.originProduct.detailAttribute?.seoInfo;
    if (seo) {
      // sellerTags: DB 빈배열/부재 + 네이버 태그 존재 → 보존
      if ((!seo.sellerTags || seo.sellerTags.length === 0) && curSellerTags.length > 0) {
        seo.sellerTags = curSellerTags
          .filter(t => t && typeof t.text === 'string')
          .map(t => ({ text: String(t.text).slice(0, 20) }));
        notes.push(`sellerTags=preserved(${seo.sellerTags.length})`);
      }
      // metaDescription: DB 빈문자열 + 네이버 값 존재 → 보존
      if ((!seo.metaDescription || seo.metaDescription.trim().length === 0) && curMetaDesc.trim().length > 0) {
        seo.metaDescription = curMetaDesc;
        notes.push('metaDescription=preserved');
      }
    }

    // leafCategoryId (2026-08-12 확장) — DB-built 값이 네이버 8자리 리프코드 형식이
    // 아니면(초기버전 import 공백 포함) 네이버 현재 카테고리로 대체.
    const curLeafCategoryId = typeof curOrigin?.leafCategoryId === 'string'
      ? curOrigin.leafCategoryId
      : (typeof curOrigin?.leafCategoryId === 'number' ? String(curOrigin.leafCategoryId) : '');
    if (!VALID_LEAF_CATEGORY_ID.test(payload.originProduct.leafCategoryId)
      && VALID_LEAF_CATEGORY_ID.test(curLeafCategoryId)) {
      payload.originProduct.leafCategoryId = curLeafCategoryId;
      notes.push(`leafCategoryId=preserved(${curLeafCategoryId})`);
    }

    // originAreaInfo.content (원산지 라벨, 2026-08-12 확장) — DB naver_origin이
    // 비어 payload에 content 키 자체가 빠져 있는데 네이버에는 라벨이 있으면 보존.
    // originAreaCode 자체는 DB 기본값("0001")이 있어 비는 경우가 없으므로 대상 아님.
    const originArea = payload.originProduct.detailAttribute?.originAreaInfo;
    const curOriginArea = curDetailAttr?.originAreaInfo as Record<string, unknown> | undefined;
    const curOriginContent = typeof curOriginArea?.content === 'string' ? curOriginArea.content : '';
    if (originArea && !originArea.content && curOriginContent.trim().length > 0) {
      originArea.content = curOriginContent;
      notes.push('originAreaInfo.content=preserved');
    }
  } catch (getErr: unknown) {
    // GET 실패는 기존 필드(detailContent 등)엔 non-fatal이었으나, leafCategoryId가
    // DB에서부터 이미 무효였다면 이번엔 복구 수단이 없다는 뜻 — 아래
    // leafCategoryIdInvalid 판정에서 하드 블록으로 이어짐.
    console.warn(
      '[naver/products/update] GET current-state failed — null defense skipped:',
      getErr instanceof Error ? getErr.message : String(getErr),
    );
    notes.push('get-failed');
    getFailed = true;
  }

  return {
    notes,
    leafCategoryIdInvalid: !VALID_LEAF_CATEGORY_ID.test(payload.originProduct.leafCategoryId),
    getFailed,
  };
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
      // 2026-08-12 — GET-merge defense must run in dryRun too, otherwise the
      // preview shows the pre-merge (possibly blank) value and misleads the
      // operator into thinking a real PUT would wipe a field that the real
      // path would actually have preserved (or vice versa — see handoff).
      const defense = await applyNaverStateDefense(payload, naverProductId);
      const oa = payload.originProduct.detailAttribute?.originAreaInfo;
      return NextResponse.json({
        success: true,
        dryRun: true,
        mode: 'UPDATE',
        naverProductId,
        endpoint: `PUT /v2/products/origin-products/${naverProductId}`,
        fieldsRequested: Array.isArray(fields) ? fields : null,
        validation,
        nullDefense: defense.notes,
        wouldBlockRealPut: defense.leafCategoryIdInvalid
          ? '카테고리코드가 앱 DB와 네이버 양쪽 모두에서 확인되지 않아 실 수정(confirm:true)은 차단됩니다 — 카테고리를 먼저 지정하세요.'
          : null,
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

    // 9-2. Null defense (§4-C, extended 2026-08-12) — GET current Naver state,
    // preserve detailContent / sellerTags / metaDescription / leafCategoryId /
    // originAreaInfo.content when the DB-built payload is degenerate.
    const defense = await applyNaverStateDefense(payload, naverProductId);
    const nullDefenseNote = defense.notes;

    // 9-3. Hard block (2026-08-12, docs/handoff/CODE_PARTIAL_SYNC_SAFETY_HANDOFF_
    // 2026-08-11.md) — leafCategoryId is still unusable after the GET-merge
    // attempt (DB blank AND Naver GET didn't recover it, or the GET itself
    // failed). v2 PUT is FULL REPLACE — sending an empty/invalid leafCategoryId
    // would erase the product's real Naver category. Refuse rather than guess.
    if (defense.leafCategoryIdInvalid) {
      return NextResponse.json({
        success: false,
        error: defense.getFailed
          ? '카테고리코드가 앱 DB에 없고, 네이버 현재값 조회(GET)도 실패해 안전하게 병합할 수 없습니다 — 수정 중단 (기존 상품 미변경). 잠시 후 다시 시도하거나 카테고리를 직접 지정하세요.'
          : '카테고리코드가 앱 DB와 네이버 양쪽 모두에서 확인되지 않습니다 — 수정 중단 (기존 상품 미변경). 카테고리를 먼저 지정한 뒤 다시 시도하세요.',
        stage: 'CATEGORY_UNRESOLVED',
        nullDefense: nullDefenseNote,
      }, { status: 409 });
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
