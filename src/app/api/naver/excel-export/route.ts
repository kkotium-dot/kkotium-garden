// POST /api/naver/excel-export  — multi-mode Naver Excel export (ExcelJS)
// GET  /api/naver/excel-export?mode=template — empty template download
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma'; // use Prisma singleton — avoids Supabase RLS
import { generateNaverExcelBuffer, buildNaverWorkbook } from '@/lib/excel/naverExcelJS';
import type { NaverProductData, ExcelGenerateOptions } from '@/lib/excel/naverExcel.types';

// Helper: map Supabase row to NaverProductData

export const dynamic = 'force-dynamic';

// MISSING_OPTIONS_FIX_2026-09-15 (원본메모: "조합형 옵션이 엑셀에 제대로
// 적용 안 됨") — 실측 재조사 결과 실제로는 "잘못 변환"이 아니라 옵션 필드가
// toNaverProduct에 아예 매핑돼 있지 않아 옵션 있는 상품은 엑셀에서 옵션 정보
// 자체가 통째로 사라지고 있었다(더 심각한 결함). 실제 옵션 데이터는
// Product.optionType/optionName 레거시 필드가 아니라 관계테이블
// product_options(option_type/option_names/option_rows JSON, DB 실측 확인)에
// 있다. 네이버 공식 규격(ExcelSaveTemplate 5행)대로 변환:
// - 옵션형태: '조합형'/'단독형' 그대로
// - 옵션명: 줄바꿈(엔터)으로 구분
// - 옵션값: 옵션명이 여러개면 줄바꿈, 각 옵션명 내 값은 콤마(,)로 구분
// - 옵션가/옵션재고: 첫번째 옵션값 기준, 콤마로 구분(네이버 "조합형 옵션가
//   등록 시 주의사항" 규격 — 첫 옵션값에 조합되는 전체에 동일 가격/재고 적용)
function buildOptionFields(po: any): Partial<NaverProductData> {
  if (!po || !Array.isArray(po.option_rows) || po.option_rows.length === 0) return {};
  const names: string[] = Array.isArray(po.option_names) ? po.option_names : [];
  const rows: Array<{ price?: number; stock?: number; values?: string[] }> = po.option_rows;

  // Naver spec: option values grouped by option name, using the FIRST
  // option-name's distinct values as the price/stock carrier row.
  const firstGroupVals = [...new Set(rows.map(r => r.values?.[0] ?? '').filter(Boolean))];
  const optionValueLines = names.map((_, nameIdx) => {
    const valsForThisName = [...new Set(rows.map(r => r.values?.[nameIdx] ?? '').filter(Boolean))];
    return valsForThisName.join(',');
  }).join('\n');

  const pricesFirstGroup = firstGroupVals.map(val => {
    const match = rows.find(r => r.values?.[0] === val);
    return String(match?.price ?? 0);
  }).join(',');
  const stocksFirstGroup = firstGroupVals.map(val => {
    const match = rows.find(r => r.values?.[0] === val);
    return String(match?.stock ?? 0);
  }).join(',');

  return {
    optionType:   po.option_type === 'COMBINATION' ? '조합형' : '단독형',
    optionNames:  names.join('\n'),
    optionValues: optionValueLines,
    optionPrices: pricesFirstGroup,
    optionStocks: stocksFirstGroup,
  };
}

function toNaverProduct(p: any): NaverProductData {
  return {
    sellerProductCode: p.sellerCode ?? p.sku ?? '',
    categoryId:        p.naverCategoryCode ?? '',
    productName:       p.seoTitle ?? p.aiGeneratedTitle ?? p.name ?? '',
    productStatus:     p.productStatus ?? undefined,
    price:             Number(p.salePrice) || 0,
    taxType:           p.taxType ?? undefined,
    stock:             Number(p.stock) || 999,
    mainImage:         p.mainImage ?? '',
    // FIELD_NAME_FIX_2026-09-15 — 원본메모 "추가이미지가 엑셀에 콤마로
    // 잘못 들어간다" 재조사 결과 실제로는 더 심각한 결함이었음: 이 코드가
    // 존재하지 않는 필드명 p.additionalImages를 읽고 있었다(실제 Prisma/DB
    // 컬럼명은 images, text[] 배열). 항상 undefined라 추가이미지가 엑셀에
    // 아예 안 실렸다(빈 값이 되는 게 아니라 완전 누락) — 콤마 결함이
    // 아니라 필드명 오타였다. 네이버 공식 규격(ExcelSaveTemplate 5행)대로
    // 줄바꿈(\n)으로 조인.
    additionalImages:  Array.isArray(p.images) && p.images.length > 0
      ? p.images.join('\n')
      : undefined,
    description:       p.aiGeneratedDesc ?? p.description ?? p.name ?? '',
    brand:             p.brand ?? undefined,
    manufacturer:      p.manufacturer ?? undefined,
    originCode:        p.originCode ?? undefined,
    // FIELD_NAME_FIX_2026-09-15 — 같은 클래스 오류(#370 전수확인 중 발견):
    // p.deliveryTemplateCode도 존재하지 않는 필드명이었다. 실제 Prisma
    // 컬럼은 shipping_template_id — 배송비 템플릿코드가 마찬가지로 항상
    // undefined라 엑셀에서 누락되고 있었다.
    deliveryTemplateCode: p.shipping_template_id ?? undefined,
    // AS_TEMPLATE_CODE_FIX_2026-09-15 (원본메모: "상품정보제공고시 템플릿에
    // A/S템플릿 코드가 들어가있다, 템플릿 코드 적용 위치 파악해 수정") —
    // 실측 확정: noticeTemplateCode(51번 컬럼, 상품정보제공고시)와
    // asTemplateCode(56번 컬럼, A/S)는 이미 각각 정확한 별개 컬럼으로
    // 올바르게 매핑돼 있었다(naverExcelJS.ts) — "뒤바뀐" 게 아니라 둘 다
    // 이 변환함수에서 아예 누락돼 있어 매번 공란으로 나가고 있었다.
    // 네이버 공식 규격(ExcelSaveTemplate 5행 56번): "A/S템플릿코드가
    // 기재되면 A/S전화번호/안내는 무시된다" — asTemplateCode가 항상
    // 빈값이었으니 57/58번(전화번호/안내)이 항상 필수로 요구됐고, 마침
    // asPhone 기본값이 잘못된 텍스트('고객센터 문의', 별도 수정완료)였던
    // 것이 겹쳐 증상이 드러난 것으로 판단.
    noticeTemplateCode: p.noticeTemplateCode ?? undefined,
    asTemplateCode:    p.asTemplateCode ?? undefined,
    asPhone:           p.asPhone ?? undefined,
    asGuide:           p.asInfo ?? undefined,
    ...buildOptionFields(p.product_options),
  };
}

function excelResponse(buffer: Buffer, filename: string) {
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
      'Content-Length': buffer.byteLength.toString(),
    },
  });
}

interface ExportRequest {
  mode: 'single' | 'batch' | 'filter' | 'template';
  productId?: string;
  productIds?: string[];
  shippingTemplateCode?: string;
  filters?: {
    status?: string;
    minScore?: number;
    supplierId?: string;
    categoryCode?: string;
    dateFrom?: string;
    dateTo?: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: ExportRequest = await request.json();
    let buffer: Buffer;
    let filename: string;

    switch (body.mode) {
      case 'single': {
        if (!body.productId) return NextResponse.json({ success: false, error: 'productId required' }, { status: 400 });
        const product = await prisma.product.findUnique({ where: { id: body.productId }, include: { product_options: true } });
        if (!product) return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
        buffer = await generateNaverExcelBuffer({
          products: [toNaverProduct(product)],
          shippingTemplate: body.shippingTemplateCode ? { templateCode: body.shippingTemplateCode } : undefined,
        });
        filename = `naver_product_${body.productId}_${Date.now()}.xlsx`;
        break;
      }

      case 'batch': {
        if (!body.productIds?.length) return NextResponse.json({ success: false, error: 'productIds required' }, { status: 400 });
        const products = await prisma.product.findMany({ where: { id: { in: body.productIds } }, include: { product_options: true } });
        if (!products.length) return NextResponse.json({ success: false, error: 'No products found' }, { status: 404 });
        buffer = await generateNaverExcelBuffer({
          products: products.map(toNaverProduct),
          shippingTemplate: body.shippingTemplateCode ? { templateCode: body.shippingTemplateCode } : undefined,
        });
        filename = `naver_products_${products.length}개_${Date.now()}.xlsx`;
        break;
      }

      case 'filter': {
        // filters is optional — no filters = export all products
        const f = body.filters ?? {};
        const where: any = {};
        if (f.status)       where.status            = f.status;
        if (f.supplierId)   where.supplierId        = f.supplierId;
        if (f.categoryCode) where.naverCategoryCode = f.categoryCode;
        if (f.dateFrom || f.dateTo) {
          where.createdAt = {};
          if (f.dateFrom) where.createdAt.gte = new Date(f.dateFrom);
          if (f.dateTo)   where.createdAt.lte = new Date(f.dateTo);
        }
        const products = await prisma.product.findMany({ where, take: 500, include: { product_options: true } });
        if (products.length === 0) return NextResponse.json({ success: false, error: '조건에 맞는 상품이 없습니다' }, { status: 404 });
        buffer = await generateNaverExcelBuffer({ products: products.map(toNaverProduct) });
        filename = `naver_products_${products.length}개_${Date.now()}.xlsx`;
        break;
      }

      case 'template': {
        // Empty template: generate with zero data rows
        buffer = await generateNaverExcelBuffer({ products: [], includeGuideRow: true });
        filename = `naver_template_${Date.now()}.xlsx`;
        break;
      }

      default:
        return NextResponse.json({ success: false, error: 'Invalid mode' }, { status: 400 });
    }

    return excelResponse(buffer, filename);
  } catch (error) {
    console.error('[api/naver/excel-export] POST error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const mode = new URL(request.url).searchParams.get('mode');
    if (mode !== 'template') {
      return NextResponse.json({ success: false, error: 'GET supports mode=template only' }, { status: 400 });
    }
    const buffer = await generateNaverExcelBuffer({ products: [], includeGuideRow: true });
    return excelResponse(buffer, `naver_template_${Date.now()}.xlsx`);
  } catch (error) {
    console.error('[api/naver/excel-export] GET error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
