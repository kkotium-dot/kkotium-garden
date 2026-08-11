// src/app/api/products/import/route.ts
// ============================================================================
// PRODUCT-LINK PL-1 — import selected Naver products into the local app.
//
// body: { items: [{ originProductNo?, channelProductNo? }] }
//   - originProductNo given (picker path) → getProduct → map → create.
//   - only channelProductNo given (manual entry) → getChannelProduct to
//     normalize to originProductNo first.
// Dedup: existing naverProductId → skip ("이미 연동됨"). Partial failure is
// reported honestly per item (#82). Link metadata is written through the
// P2022-guarded helper (no-op before Desktop's ALTER). Naver write 0.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getProduct, getChannelProduct } from '@/lib/naver/api-client';
import { writeLinkFields } from '@/lib/product-link';
import { NAVER_ORIGIN_CODES, originCodeLabel } from '@/lib/naver/naver-origin-codes';

export const dynamic = 'force-dynamic';

interface ImportItem {
  originProductNo?: string | number;
  channelProductNo?: string | number;
}

// Map a Naver statusType to the app's Product.status.
function mapStatus(statusType: string | null | undefined): string {
  switch (statusType) {
    case 'SALE':       return 'ACTIVE';
    case 'OUTOFSTOCK': return 'OUT_OF_STOCK';
    case 'SUSPENSION': return 'INACTIVE';
    default:           return 'ACTIVE';
  }
}

function pickImageUrl(op: any): string | null {
  return (
    op?.images?.representativeImage?.url ??
    op?.images?.representativeImageUrl ??
    op?.representativeImage?.url ??
    null
  );
}

// #5/#6 — 가져온 상품이 씨앗심기(?edit=)로 열릴 때 재입력 없이 이어 쓸 수 있도록,
// Naver 원상품 상세에 이미 있는 정보는 가져오기 시점에 최대한 함께 저장한다.
// (씨앗심기 hydrate 자체는 정상 — 문제는 import가 name/salePrice/mainImage 외
// 전부 비워서 저장했던 것.)
function pickAdditionalImages(op: any): string[] {
  const opt = op?.images?.optionalImages;
  if (!Array.isArray(opt)) return [];
  return opt.map((i: any) => i?.url).filter((u: unknown): u is string => typeof u === 'string' && !!u);
}

function pickSellerTags(op: any): string[] {
  const tags = op?.detailAttribute?.seoInfo?.sellerTags;
  if (!Array.isArray(tags)) return [];
  return tags.map((t: any) => t?.text).filter((t: unknown): t is string => typeof t === 'string' && !!t);
}

// #1 (2026-08-11) — 원산지 미연동 근본수정. Product.originCode는 네이버
// originAreaCode와 **같은 코드표**(원산지코드.xls 518건, src/lib/naver/
// naver-origin-codes.ts)를 기준으로 검증된다(product-builder.ts
// OFFICIAL_ORIGIN_CODES 참조) — 코드체계가 다르다는 이전 가정은 틀렸으므로
// 변환 없이 그대로 저장해도 안전하다. 표에 없는 코드는 저장하지 않는다
// (스키마 default '0001'로 남겨 다음 라운드 정정 — 추측 저장 금지 #82).
const OFFICIAL_ORIGIN_CODE_SET = new Set(NAVER_ORIGIN_CODES.map((o) => o.code));
function pickOrigin(op: any): { originCode: string | undefined; naverOrigin: string | undefined; importerName: string | undefined } {
  const originAreaInfo = (op?.detailAttribute?.originAreaInfo ?? {}) as Record<string, any>;
  const rawCode = typeof originAreaInfo.originAreaCode === 'string' ? originAreaInfo.originAreaCode.trim() : '';
  const originCode = rawCode && OFFICIAL_ORIGIN_CODE_SET.has(rawCode) ? rawCode : undefined;
  const content = typeof originAreaInfo.content === 'string' && originAreaInfo.content.trim() ? originAreaInfo.content.trim() : undefined;
  const naverOrigin = content ?? (originCode ? originCodeLabel(originCode) : undefined);
  const importerName = typeof originAreaInfo.importer === 'string' && originAreaInfo.importer.trim() ? originAreaInfo.importer.trim() : undefined;
  return { originCode, naverOrigin, importerName };
}

// #2 (2026-08-12, docs/handoff/CODE_IMPORT_FIELD_COMPLETENESS_HANDOFF_2026-08-11.md)
// — AS 전화번호/안내. 실 getProduct() 응답으로 구조 확인(추측 아님): 원본
// afterServiceTelephoneNumber/afterServiceGuideContent 그대로 존재. asGuide는
// product-form-mapping.ts #150 별칭 그대로 Product.asInfo 컬럼에 저장한다
// (buildNaverProductPayload도 이 컬럼을 읽음 — product-builder.ts:1085).
function pickAfterService(op: any): { asPhone: string | undefined; asGuide: string | undefined } {
  const info = (op?.detailAttribute?.afterServiceInfo ?? {}) as Record<string, any>;
  const asPhone = typeof info.afterServiceTelephoneNumber === 'string' && info.afterServiceTelephoneNumber.trim()
    ? info.afterServiceTelephoneNumber.trim() : undefined;
  const asGuide = typeof info.afterServiceGuideContent === 'string' && info.afterServiceGuideContent.trim()
    ? info.afterServiceGuideContent.trim() : undefined;
  return { asPhone, asGuide };
}

// 브랜드 — 실 응답 구조 확인 결과 detailAttribute.naverShoppingSearchInfo.brandName에
// 있음(buildNaverProductPayload가 실제 PUT에 내보내지는 않고 내부 완결성 점수
// (calcAttributeCompleteness)에만 쓰는 필드라 우선순위상 naver_brand로 저장 —
// 다른 naver_* 접두 컬럼(naver_material 등)과 동일하게 "네이버에서 읽어온 값"
// 구역에 둔다. Product.brand(연산자 직접 입력)는 건드리지 않는다.
function pickBrand(op: any): string | undefined {
  const b = op?.detailAttribute?.naverShoppingSearchInfo?.brandName;
  return typeof b === 'string' && b.trim() ? b.trim() : undefined;
}

// 판매자 상품코드 — 실 응답 확인: detailAttribute.sellerCodeInfo.sellerManagementCode.
// buildNaverProductPayload가 실제 PUT에 내보내는 컬럼은 Product.sellerProductCode
// (product-builder.ts:1094) — Product.sku(내부 SKU, import가 이미 NAVER-{no}로
// 채움)와는 다른 컬럼이니 혼동 금지. 씨앗심기 폼의 "판매자 상품코드" 입력란은
// 현재 sku 컬럼에 저장되도록 배선돼 있어(product-form-mapping.ts) 이 임포트
// 값과 별개로 남는다 — 별개 이슈로 기록만(#340과 같은 패턴, 이번 스코프 아님).
function pickSellerCode(op: any): string | undefined {
  const code = op?.detailAttribute?.sellerCodeInfo?.sellerManagementCode;
  return typeof code === 'string' && code.trim() ? code.trim() : undefined;
}

// 단위가격(§4-A) — 실 6개 연동상품 전부 이 정책 비대상 카테고리라 실측 예시는
// 없었으나, unitPriceInfo는 우리가 PUT으로 보내는 것과 동일한 형(unitPriceYn/
// totalCapacityValue/unitCapacity/indicationUnit — product-builder.ts:1043-1055)을
// 네이버 API 공식문서가 대칭으로 정의(afterServiceInfo/sellerCodeInfo/
// originAreaInfo 전부 대칭 확인됨). 카테고리 비대상 상품은 그냥 undefined.
function pickUnitPrice(op: any): {
  unit_price_yn: boolean | undefined;
  unit_total_capacity: number | undefined;
  unit_capacity: number | undefined;
  unit_indication_unit: string | undefined;
} {
  const info = op?.detailAttribute?.unitPriceInfo as Record<string, any> | undefined;
  if (!info) return { unit_price_yn: undefined, unit_total_capacity: undefined, unit_capacity: undefined, unit_indication_unit: undefined };
  return {
    unit_price_yn: info.unitPriceYn === 'Y' ? true : (info.unitPriceYn === 'N' ? false : undefined),
    unit_total_capacity: typeof info.totalCapacityValue === 'number' ? info.totalCapacityValue : undefined,
    unit_capacity: typeof info.unitCapacity === 'number' ? info.unitCapacity : undefined,
    unit_indication_unit: typeof info.indicationUnit === 'string' && info.indicationUnit.trim() ? info.indicationUnit.trim() : undefined,
  };
}

// #4 — 마진 계산은 salePrice - instant_discount(원)를 실제 판매가로 쓴다
// (profitability/route.ts). 네이버 즉시할인(customerBenefit.immediateDiscountPolicy,
// PC 우선)을 읽어 원화 금액으로 환산해 그대로 세팅 — 안 하면 마진이 정가 기준으로 계산됨.
function pickInstantDiscountWon(op: any, salePrice: number): number | null {
  const method = op?.customerBenefit?.immediateDiscountPolicy?.discountMethod?.[0];
  if (!method || typeof method.value !== 'number') return null;
  if (method.unitType === 'PERCENT') {
    return Math.floor(salePrice * Math.min(Math.max(method.value, 0), 100) / 100);
  }
  if (method.unitType === 'WON') {
    return Math.min(Math.max(method.value, 0), salePrice);
  }
  return null;
}

export async function POST(request: NextRequest) {
  let body: { items?: ImportItem[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: '잘못된 요청 본문' }, { status: 400 });
  }
  const items = Array.isArray(body?.items) ? body.items : [];
  if (items.length === 0) {
    return NextResponse.json({ success: false, error: '연동할 상품이 없습니다.' }, { status: 400 });
  }

  const defaultSupplier = await prisma.supplier.findFirst();
  const defaultUser = await prisma.user.findFirst();
  if (!defaultSupplier || !defaultUser) {
    return NextResponse.json(
      { success: false, error: '기본 공급사/사용자가 없어 임포트할 수 없습니다.' },
      { status: 400 },
    );
  }

  const imported: Array<{ no: string; id: string; name: string }> = [];
  const skipped: Array<{ no: string; reason: string }> = [];
  const failed: Array<{ no: string; error: string }> = [];

  for (const raw of items) {
    let channelNo = raw?.channelProductNo != null ? String(raw.channelProductNo) : null;
    let originNo = raw?.originProductNo != null ? String(raw.originProductNo) : null;
    const label = originNo ?? channelNo ?? '(번호 없음)';

    try {
      // Normalize a manual channel number to its origin number.
      if (!originNo && channelNo) {
        const ch = await getChannelProduct(channelNo);
        originNo = String(
          ch?.originProductNo ??
          ch?.originProduct?.originProductNo ??
          ch?.originProduct?.no ??
          '',
        ) || null;
        if (!originNo) {
          failed.push({ no: label, error: '원상품번호(originProductNo)를 확인할 수 없습니다.' });
          continue;
        }
      }
      if (!originNo) {
        failed.push({ no: label, error: '상품번호가 비어 있습니다.' });
        continue;
      }

      // Dedup — naverProductId is the mapping key (= originProductNo).
      const existing = await prisma.product.findFirst({
        where: { naverProductId: originNo },
        select: { id: true },
      });
      if (existing) {
        skipped.push({ no: originNo, reason: '이미 연동됨' });
        continue;
      }

      // Fetch full detail and map to the app schema.
      const detail = await getProduct(originNo);
      const op = detail?.originProduct ?? {};
      const name: string = typeof op.name === 'string' && op.name ? op.name : `네이버 상품 ${originNo}`;
      const salePrice = Number.isFinite(op?.salePrice) ? Number(op.salePrice) : 0;
      const modifiedDate: string | null = op?.modifiedDate ?? detail?.modifiedDate ?? null;
      const instantDiscount = pickInstantDiscountWon(op, salePrice);
      const description: string | undefined =
        typeof op?.detailContent === 'string' && op.detailContent.trim() ? op.detailContent : undefined;
      const naverCategoryCode: string | undefined =
        typeof op?.leafCategoryId === 'string' && op.leafCategoryId ? op.leafCategoryId : undefined;
      const additionalImages = pickAdditionalImages(op);
      const sellerTags = pickSellerTags(op);
      const { originCode, naverOrigin, importerName } = pickOrigin(op);
      const { asPhone, asGuide } = pickAfterService(op);
      const naverBrand = pickBrand(op);
      const sellerProductCode = pickSellerCode(op);
      const unitPrice = pickUnitPrice(op);

      const created = await prisma.product.create({
        data: {
          name,
          salePrice,
          supplierPrice: 0,      // unknown for an imported listing (no cost basis)
          margin: 0,             // recomputed once a supplier cost is entered
          sku: `NAVER-${originNo}`,
          supplierId: defaultSupplier.id,
          userId: defaultUser.id,
          naverProductId: originNo,
          status: mapStatus(op?.statusType),
          mainImage: pickImageUrl(op),
          naver_status_type: typeof op?.statusType === 'string' ? op.statusType : null,
          instant_discount: instantDiscount,
          description,
          naverCategoryCode,
          images: additionalImages,
          tags: sellerTags.length > 0 ? sellerTags : undefined,
          originCode,
          naver_origin: naverOrigin,
          importer_name: importerName,
          // #2 (2026-08-12, 결과 문서: CODE_IMPORT_FIELD_COMPLETENESS_2026-08-11.md)
          // — 갭 목록 10건 중 실제로 네이버 응답에 존재해 복구 가능한 5건
          // (asPhone/asGuide/brand/sellerCode/unitPrice). 나머지 5건
          // (detailImages/detailImageUrl/hookPhrase/keywords/shippingTemplateId)은
          // 결과 문서에 사유와 함께 화이트리스트 제외로 기록 — 추측 매핑 금지.
          asPhone,
          asInfo: asGuide,
          naver_brand: naverBrand,
          sellerProductCode,
          unit_price_yn: unitPrice.unit_price_yn,
          unit_total_capacity: unitPrice.unit_total_capacity,
          unit_capacity: unitPrice.unit_capacity,
          unit_indication_unit: unitPrice.unit_indication_unit,
        },
        select: { id: true },
      });

      // Link metadata — guarded (no-op until the ALTER lands).
      await writeLinkFields(created.id, {
        source: 'IMPORTED',
        channelProductNo: channelNo,
        linkStatus: 'LINKED',
        naverModifiedAt: modifiedDate,
        lastSyncedAt: new Date().toISOString(),
        syncState: 'SYNCED',
      });

      imported.push({ no: originNo, id: created.id, name });
    } catch (e) {
      const msg = e instanceof Error ? e.message : '알 수 없는 오류';
      failed.push({ no: label, error: msg });
    }
  }

  return NextResponse.json({ success: true, imported, skipped, failed });
}
