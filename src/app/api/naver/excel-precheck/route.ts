// src/app/api/naver/excel-precheck/route.ts
// ============================================================================
// EXCEL_PRECHECKER_2026-09-16 (v.01/v.02 지침서: "네이버 엑셀 변환 사전 검수
// 신호등(Excel Pre-checker)" — 다운로드 버튼을 누르기 전, 실패 원인이 되는
// 결함을 0.1초 만에 스캔해 다운로드 가능 / 엑셀 양식 오류 N건 감지로
// 알려준다.
//
// 단일권위(#62): 실제 엑셀 생성기가 쓰는 toNaverProduct(lib/naver/to-naver-
// product.ts로 분리됨)를 그대로 재사용해 변환한 뒤, 그 결과(NaverProductData)
// 를 검사한다 — 별도의 검증 로직을 새로 만들면 생성 로직과 검증 로직이 서로
// 다른 필드를 보게 되어(#371류 위험) 시간이 지나며 어긋날 수 있다.
//
// 검사 항목은 이번 세션에서 실측으로 확정한 실제 결함 이력에서 가져왔다
// (근거 없이 임의의 규칙을 만들지 않음, #357):
//   - 네이버 공식 규격(ExcelSaveTemplate_20260324.xlsx 5행)에서 "필수입력"
//     으로 명시된 필드가 비어있는 경우
//   - A/S: asTemplateCode가 없으면 asPhone은 숫자/하이픈/더하기만 가능한데
//     그 형식을 벗어난 경우(과거 실제 결함: '고객센터 문의' 텍스트)
//   - 옵션이 있는데 optionType/optionNames/optionValues 중 일부만 채워진
//     경우(조합/단독형 불일치)
//   - 추가이미지 URL에 콤마가 섞여있는 경우(과거 실제 결함의 흔적)
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { toNaverProduct } from '@/lib/naver/to-naver-product';
import type { NaverProductData } from '@/lib/excel/naverExcel.types';

export const dynamic = 'force-dynamic';

export interface PrecheckIssue {
  field: string;
  severity: 'error' | 'warning';
  message: string;
}

export interface PrecheckResult {
  productId: string;
  productName: string;
  ok: boolean;
  issues: PrecheckIssue[];
}

const AS_PHONE_PATTERN = /^[0-9+\-]{1,20}$/;

function checkOne(p: any, nd: NaverProductData): PrecheckResult {
  const issues: PrecheckIssue[] = [];

  if (!nd.productName?.trim()) {
    issues.push({ field: '상품명', severity: 'error', message: '상품명이 비어있어요' });
  }
  if (!nd.mainImage?.trim()) {
    issues.push({ field: '대표이미지', severity: 'error', message: '대표이미지가 없으면 네이버가 등록을 거부해요' });
  }
  if (!nd.categoryId?.trim()) {
    issues.push({ field: '카테고리', severity: 'error', message: '카테고리가 선택되지 않았어요' });
  }
  if (!nd.price || nd.price <= 0) {
    issues.push({ field: '판매가', severity: 'error', message: '판매가가 0원이거나 비어있어요' });
  }

  if (!nd.asTemplateCode?.trim()) {
    if (!nd.asPhone?.trim()) {
      issues.push({ field: 'A/S 전화번호', severity: 'error', message: 'A/S 템플릿코드가 없으면 전화번호가 필수예요' });
    } else if (!AS_PHONE_PATTERN.test(nd.asPhone.trim())) {
      issues.push({
        field: 'A/S 전화번호',
        severity: 'error',
        message: `"${nd.asPhone}" — 숫자·하이픈(-)·더하기(+)만 입력 가능해요(네이버 규격)`,
      });
    }
    if (!nd.asGuide?.trim()) {
      issues.push({ field: 'A/S 안내', severity: 'error', message: 'A/S 템플릿코드가 없으면 안내문구가 필수예요' });
    }
  }

  if (!nd.deliveryTemplateCode?.trim()) {
    issues.push({ field: '배송 템플릿', severity: 'warning', message: '배송 템플릿이 연결되지 않았어요 — 배송비가 0원으로 나갈 수 있어요' });
  }

  const hasAnyOptionField = !!(nd.optionType || nd.optionNames || nd.optionValues);
  if (hasAnyOptionField) {
    if (!nd.optionNames?.trim()) {
      issues.push({ field: '옵션명', severity: 'error', message: '옵션값은 있는데 옵션명이 비어있어요' });
    }
    if (!nd.optionValues?.trim()) {
      issues.push({ field: '옵션값', severity: 'error', message: '옵션명은 있는데 옵션값이 비어있어요' });
    }
    if (nd.optionValues && nd.optionPrices) {
      const valCount = nd.optionValues.split('\n').flatMap((line) => line.split(',')).filter(Boolean).length;
      const priceCount = nd.optionPrices.split(',').filter(Boolean).length;
      if (nd.optionType === '단독형' && valCount !== priceCount) {
        issues.push({
          field: '옵션가',
          severity: 'warning',
          message: `옵션값 ${valCount}개인데 옵션가는 ${priceCount}개예요 — 수량이 안 맞을 수 있어요`,
        });
      }
    }
  }

  if (nd.additionalImages?.includes(',http')) {
    issues.push({
      field: '추가이미지',
      severity: 'error',
      message: '추가이미지가 쉼표로 구분돼 있어요 — 네이버는 줄바꿈 구분만 인식해요',
    });
  }

  if (nd.taxType && !['과세상품', '면세상품', '영세상품'].includes(nd.taxType)) {
    issues.push({
      field: '부가세',
      severity: 'error',
      message: `"${nd.taxType}" — 네이버 규격은 과세상품/면세상품/영세상품만 허용해요`,
    });
  }

  const hasError = issues.some((i) => i.severity === 'error');
  return {
    productId: p.id,
    productName: nd.productName || p.name || '(이름 없음)',
    ok: !hasError,
    issues,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const ids: string[] = Array.isArray(body?.productIds)
      ? body.productIds.filter((x: unknown): x is string => typeof x === 'string')
      : typeof body?.productId === 'string'
        ? [body.productId]
        : [];

    if (ids.length === 0) {
      return NextResponse.json({ success: false, error: 'productId(s)가 필요합니다' }, { status: 400 });
    }

    const products = await prisma.product.findMany({
      where: { id: { in: ids } },
      include: { product_options: true },
    });

    const results: PrecheckResult[] = products.map((p) => {
      const nd = toNaverProduct(p);
      return checkOne(p, nd);
    });

    const okCount = results.filter((r) => r.ok).length;
    return NextResponse.json({
      success: true,
      allOk: results.every((r) => r.ok),
      okCount,
      errorCount: results.length - okCount,
      results,
    });
  } catch (e: unknown) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
